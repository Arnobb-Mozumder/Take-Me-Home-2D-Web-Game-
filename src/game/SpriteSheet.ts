import { SpriteConfig, Rect } from './types';

export interface FrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class SpriteSheet {
  public image: HTMLImageElement | null = null;
  public isLoaded = false;
  public frameCount = 1;
  public frameWidth = 64;
  public frameHeight = 64;
  public frameDuration = 0.1; // Seconds per frame
  public loop = true;

  public frames: FrameRect[] = [];

  private elapsedTime = 0;
  private currentFrame = 0;
  private customFrameIndex: number | null = null;

  private retryTimeout: number | null = null;
  private retryCount = 0;
  private maxRetries = 5;

  constructor(public config: SpriteConfig) {
    this.frameDuration = config.frameDuration;
    this.loop = config.loop;
    this.load(config.url, config.frameCount);
  }

  public load(url: string, explicitFrameCount?: number) {
    this.isLoaded = false;
    if (this.retryTimeout !== null) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.image = img;
      this.frameHeight = img.naturalHeight || 64;
      this.retryCount = 0;

      // Extract frame bounding boxes via canvas pixel analysis
      try {
        const detectedFrames = this.detectFrames(img, explicitFrameCount);
        if (detectedFrames.length > 0) {
          this.frames = detectedFrames;
          this.frameCount = detectedFrames.length;
          this.frameWidth = detectedFrames[0].width;
          this.frameHeight = detectedFrames[0].height;
        } else {
          this.fallbackSlicing(img, explicitFrameCount);
        }
      } catch (err) {
        console.warn('Canvas frame detection fallback:', err);
        this.fallbackSlicing(img, explicitFrameCount);
      }

      this.isLoaded = true;
    };

    img.onerror = () => {
      console.warn(`Failed to load sprite sheet from ${url} (attempt ${this.retryCount + 1}/${this.maxRetries})`);
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const backoff = Math.min(1000 * Math.pow(1.5, this.retryCount), 5000);
        this.retryTimeout = window.setTimeout(() => {
          this.load(url, explicitFrameCount);
        }, backoff);
      }
    };

    img.src = url;
  }

  private fallbackSlicing(img: HTMLImageElement, explicitFrameCount?: number) {
    const totalW = img.naturalWidth;
    const totalH = img.naturalHeight;

    if (explicitFrameCount && explicitFrameCount > 0) {
      this.frameCount = explicitFrameCount;
    } else if (this.config.frameWidth && this.config.frameWidth > 0) {
      this.frameCount = Math.max(1, Math.round(totalW / this.config.frameWidth));
    } else {
      const detected = Math.round(totalW / (totalH || 1));
      this.frameCount = Math.max(1, detected);
    }

    const fw = totalW / this.frameCount;
    this.frameWidth = fw;
    this.frameHeight = totalH;
    this.frames = [];

    for (let i = 0; i < this.frameCount; i++) {
      this.frames.push({
        x: i * fw,
        y: 0,
        width: fw,
        height: totalH,
      });
    }
  }

  private detectFrames(img: HTMLImageElement, explicitFrameCount?: number): FrameRect[] {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];

    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imgData;

    // Project alpha on X-axis and Y-axis to detect discrete 2D grid cells
    const xProj = new Int32Array(width);
    const yProj = new Int32Array(height);

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width * 4;
      for (let x = 0; x < width; x++) {
        if (data[rowOffset + x * 4 + 3] > 25) {
          xProj[x]++;
          yProj[y]++;
        }
      }
    }

    function getRanges(arr: Int32Array, thresh: number = 8, minLen: number = 10) {
      const ranges: { start: number; end: number }[] = [];
      let inR = false;
      let s = 0;
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] > thresh) {
          if (!inR) {
            inR = true;
            s = i;
          }
        } else {
          if (inR) {
            inR = false;
            if (i - s >= minLen) {
              ranges.push({ start: s, end: i });
            }
          }
        }
      }
      if (inR && arr.length - s >= minLen) {
        ranges.push({ start: s, end: arr.length - 1 });
      }
      return ranges;
    }

    const xRanges = getRanges(xProj, 8, 12);
    const yRanges = getRanges(yProj, 8, 12);

    if (xRanges.length === 0 || yRanges.length === 0) {
      return [{ x: 0, y: 0, width, height }];
    }

    // Single character image (like character.png)
    if (xRanges.length === 1 && yRanges.length === 1) {
      const xr = xRanges[0];
      const yr = yRanges[0];
      let minX = xr.end;
      let maxX = xr.start;
      let minY = yr.end;
      let maxY = yr.start;
      for (let y = yr.start; y <= yr.end; y++) {
        const rowOffset = y * width * 4;
        for (let x = xr.start; x <= xr.end; x++) {
          if (data[rowOffset + x * 4 + 3] > 25) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      return [{
        x: Math.max(0, minX),
        y: Math.max(0, minY),
        width: Math.max(1, maxX - minX + 1),
        height: Math.max(1, maxY - minY + 1),
      }];
    }

    // For multi-frame spritesheets (e.g. 5x5 idle.png, run.png, jump.png, or 1x8 climb.png, kick.png):
    // Filter out slivers/artifacts (< 50px wide or high for full sprite frames)
    const frames: FrameRect[] = [];

    for (const yr of yRanges) {
      for (const xr of xRanges) {
        let minX = xr.end;
        let maxX = xr.start;
        let minY = yr.end;
        let maxY = yr.start;
        let pixelCount = 0;

        for (let y = yr.start; y <= yr.end; y++) {
          const rowOffset = y * width * 4;
          for (let x = xr.start; x <= xr.end; x++) {
            if (data[rowOffset + x * 4 + 3] > 25) {
              pixelCount++;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        const fw = maxX - minX + 1;
        const fh = maxY - minY + 1;

        // Only include complete sprite cells (ignore tiny debris / edge artifacts)
        if (pixelCount > 1500 && fw >= 40 && fh >= 80) {
          const pad = 1;
          const fx = Math.max(0, minX - pad);
          const fy = Math.max(0, minY - pad);
          const finalW = Math.min(width - fx, fw + pad * 2);
          const finalH = Math.min(height - fy, fh + pad * 2);

          frames.push({
            x: fx,
            y: fy,
            width: Math.max(1, finalW),
            height: Math.max(1, finalH),
          });
        }
      }
    }

    // If explicitFrameCount is set and matches a subset or custom count, handle gracefully
    if (explicitFrameCount && explicitFrameCount > 0 && explicitFrameCount < frames.length) {
      return frames.slice(0, explicitFrameCount);
    }

    return frames.length > 0 ? frames : [{ x: 0, y: 0, width, height }];
  }

  public reset() {
    this.elapsedTime = 0;
    this.currentFrame = 0;
    this.customFrameIndex = null;
  }

  public update(dt: number) {
    if (!this.isLoaded || this.frameCount <= 1) return;

    this.elapsedTime += dt;
    const totalDuration = this.frameCount * this.frameDuration;

    if (this.loop) {
      const loopTime = this.elapsedTime % totalDuration;
      this.currentFrame = Math.floor(loopTime / this.frameDuration) % this.frameCount;
    } else {
      // Single pass - clamp to last frame
      this.currentFrame = Math.min(
        Math.floor(this.elapsedTime / this.frameDuration),
        this.frameCount - 1
      );
    }
  }

  // Force specific frame (e.g. for jump progression based on vertical velocity)
  public setCustomFrame(index: number) {
    this.customFrameIndex = Math.max(0, Math.min(index, this.frameCount - 1));
  }

  public clearCustomFrame() {
    this.customFrameIndex = null;
  }

  public getCurrentFrameIndex(): number {
    if (this.customFrameIndex !== null) {
      return this.customFrameIndex;
    }
    return this.currentFrame;
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    flipX: boolean = false
  ) {
    if (!this.isLoaded || !this.image) {
      // High-quality procedural vector soccer player character fallback while sprite loads
      this.drawFallbackCharacter(ctx, dx, dy, dw, dh, flipX);
      return;
    }

    const frameIdx = this.getCurrentFrameIndex();
    const frame = this.frames[frameIdx] || {
      x: 0,
      y: 0,
      width: this.image.naturalWidth,
      height: this.image.naturalHeight,
    };

    const sx = frame.x;
    const sy = frame.y;
    const sw = frame.width;
    const sh = frame.height;

    // Normalizing character render height across all animations:
    // Standard standing character height reference is 148px (from idle/run/jump)
    // If an animation sheet has taller frames (e.g. climb with extended arms or high kick),
    // scale proportional to standing reference so the character body stays identical in size.
    const refStandingHeight = (sh > 200) ? 228 : (sh > 160) ? 175 : 148;
    const baseScale = dh / refStandingHeight;
    const renderW = Math.round(sw * baseScale);
    const renderH = Math.round(sh * baseScale);

    // Center horizontally relative to player bounding box, bottom-align vertically with feet
    const renderX = Math.round(dx + (dw - renderW) / 2);
    const renderY = Math.round(dy + (dh - renderH));

    ctx.save();

    if (flipX) {
      // Flip horizontally around the center of the destination rectangle
      ctx.translate(renderX + renderW / 2, renderY + renderH / 2);
      ctx.scale(-1, 1);
      ctx.drawImage(
        this.image,
        sx,
        sy,
        sw,
        sh,
        -renderW / 2,
        -renderH / 2,
        renderW,
        renderH
      );
    } else {
      ctx.drawImage(
        this.image,
        sx,
        sy,
        sw,
        sh,
        renderX,
        renderY,
        renderW,
        renderH
      );
    }

    ctx.restore();
  }

  private drawFallbackCharacter(
    ctx: CanvasRenderingContext2D,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    flipX: boolean
  ) {
    ctx.save();
    const cx = dx + dw / 2;
    const cy = dy + dh / 2;

    if (flipX) {
      ctx.translate(cx, cy);
      ctx.scale(-1, 1);
      ctx.translate(-cx, -cy);
    }

    const t = performance.now() / 1000;
    const breathe = Math.sin(t * 3) * 1.5;

    // Body positions relative to (dx + dw/2, dy + dh)
    const footY = dy + dh;
    const bodyCenterX = dx + dw / 2;

    // 1. Cleats / Shoes (Black & Crimson)
    ctx.fillStyle = '#0f172a';
    // Left shoe
    ctx.beginPath();
    ctx.roundRect(bodyCenterX - 14, footY - 8, 11, 8, [2, 4, 1, 1]);
    ctx.fill();
    // Right shoe
    ctx.beginPath();
    ctx.roundRect(bodyCenterX + 3, footY - 8, 11, 8, [4, 2, 1, 1]);
    ctx.fill();

    // Red cleat studs & stripes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(bodyCenterX - 12, footY - 4, 8, 2);
    ctx.fillRect(bodyCenterX + 5, footY - 4, 8, 2);

    // 2. Socks (White with navy stripes)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(bodyCenterX - 12, footY - 22, 8, 14);
    ctx.fillRect(bodyCenterX + 4, footY - 22, 8, 14);
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(bodyCenterX - 12, footY - 20, 8, 3);
    ctx.fillRect(bodyCenterX + 4, footY - 20, 8, 3);

    // 3. Legs (Skin tone)
    ctx.fillStyle = '#fcd34d';
    ctx.fillRect(bodyCenterX - 11, footY - 36, 6, 15);
    ctx.fillRect(bodyCenterX + 5, footY - 36, 6, 15);

    // 4. Shorts (Navy blue)
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.roundRect(bodyCenterX - 16, footY - 50 + breathe * 0.5, 32, 16, 3);
    ctx.fill();
    // White side stripe
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bodyCenterX - 15, footY - 48 + breathe * 0.5, 2, 12);
    ctx.fillRect(bodyCenterX + 13, footY - 48 + breathe * 0.5, 2, 12);

    // 5. Athletic Jersey Body (Red/Crimson #dc2626)
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(bodyCenterX - 15, footY - 80 + breathe, 30, 32, [6, 6, 2, 2]);
    ctx.fill();

    // White Jersey Collar V-neck
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(bodyCenterX - 5, footY - 80 + breathe);
    ctx.lineTo(bodyCenterX, footY - 73 + breathe);
    ctx.lineTo(bodyCenterX + 5, footY - 80 + breathe);
    ctx.fill();

    // Jersey Number "10"
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('10', bodyCenterX, footY - 58 + breathe);

    // 6. Arms (Skin tone & jersey sleeves)
    // Left sleeve & arm
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(bodyCenterX - 20, footY - 80 + breathe, 6, 12);
    ctx.fillStyle = '#fcd34d';
    ctx.fillRect(bodyCenterX - 19, footY - 68 + breathe, 5, 16);

    // Right sleeve & arm
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(bodyCenterX + 14, footY - 80 + breathe, 6, 12);
    ctx.fillStyle = '#fcd34d';
    ctx.fillRect(bodyCenterX + 14, footY - 68 + breathe, 5, 16);

    // 7. Head & Neck
    ctx.fillStyle = '#fcd34d';
    // Neck
    ctx.fillRect(bodyCenterX - 4, footY - 86 + breathe, 8, 8);

    // Head
    ctx.beginPath();
    ctx.arc(bodyCenterX, footY - 96 + breathe, 11, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(bodyCenterX + 4, footY - 96 + breathe, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Hair (Dark Brown / Styled)
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(bodyCenterX - 1, footY - 100 + breathe, 11, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    // Hair tuft
    ctx.beginPath();
    ctx.moveTo(bodyCenterX - 8, footY - 104 + breathe);
    ctx.lineTo(bodyCenterX + 6, footY - 108 + breathe);
    ctx.lineTo(bodyCenterX + 10, footY - 100 + breathe);
    ctx.fill();

    ctx.restore();
  }
}
