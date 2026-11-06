import { SpriteConfig, Rect } from './types';

export interface FrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Pre-calibrated pixel-perfect frame coordinates for all bundled sprite assets
const KNOWN_FRAMES: Record<string, FrameRect[]> = {
  'character.png': [{ x: 315, y: 51, width: 580, height: 1247 }],
  'idle.png': [
    { x: 461, y: 28, width: 73, height: 152 },
    { x: 666, y: 28, width: 73, height: 152 },
    { x: 871, y: 28, width: 73, height: 152 },
    { x: 1076, y: 28, width: 73, height: 152 },
    { x: 1280, y: 28, width: 73, height: 152 },
    { x: 461, y: 233, width: 73, height: 152 },
    { x: 666, y: 233, width: 73, height: 152 },
    { x: 871, y: 233, width: 73, height: 152 },
    { x: 1076, y: 233, width: 73, height: 152 },
    { x: 1280, y: 233, width: 73, height: 152 },
    { x: 461, y: 438, width: 73, height: 152 },
    { x: 666, y: 438, width: 73, height: 152 },
    { x: 871, y: 438, width: 73, height: 152 },
    { x: 1076, y: 438, width: 73, height: 152 },
    { x: 1280, y: 438, width: 73, height: 152 },
    { x: 461, y: 643, width: 73, height: 151 },
    { x: 666, y: 643, width: 73, height: 151 },
    { x: 871, y: 643, width: 73, height: 151 },
    { x: 1075, y: 643, width: 74, height: 151 },
    { x: 1280, y: 643, width: 73, height: 151 },
    { x: 461, y: 847, width: 73, height: 152 },
    { x: 666, y: 847, width: 73, height: 152 },
    { x: 871, y: 847, width: 73, height: 152 },
  ],
  'run.png': [
    { x: 441, y: 26, width: 114, height: 144 },
    { x: 645, y: 26, width: 113, height: 147 },
    { x: 862, y: 31, width: 95, height: 155 },
    { x: 1071, y: 32, width: 90, height: 158 },
    { x: 1263, y: 25, width: 104, height: 154 },
    { x: 441, y: 229, width: 113, height: 146 },
    { x: 652, y: 235, width: 101, height: 154 },
    { x: 865, y: 237, width: 92, height: 158 },
    { x: 1064, y: 231, width: 102, height: 155 },
    { x: 1260, y: 231, width: 113, height: 144 },
    { x: 445, y: 438, width: 105, height: 156 },
    { x: 662, y: 441, width: 90, height: 159 },
    { x: 856, y: 434, width: 101, height: 156 },
    { x: 1054, y: 434, width: 115, height: 145 },
    { x: 1265, y: 440, width: 103, height: 154 },
    { x: 456, y: 647, width: 91, height: 158 },
    { x: 656, y: 641, width: 100, height: 158 },
    { x: 851, y: 640, width: 113, height: 145 },
    { x: 1060, y: 643, width: 104, height: 156 },
    { x: 1276, y: 646, width: 90, height: 159 },
    { x: 444, y: 844, width: 104, height: 154 },
    { x: 645, y: 844, width: 114, height: 145 },
    { x: 856, y: 849, width: 102, height: 155 },
    { x: 1070, y: 852, width: 91, height: 157 },
  ],
  'jump.png': [
    { x: 453, y: 238, width: 94, height: 146 },
    { x: 660, y: 236, width: 92, height: 149 },
    { x: 869, y: 224, width: 85, height: 157 },
    { x: 1067, y: 216, width: 93, height: 153 },
    { x: 1269, y: 211, width: 97, height: 149 },
    { x: 448, y: 414, width: 103, height: 147 },
    { x: 653, y: 414, width: 102, height: 151 },
    { x: 859, y: 417, width: 96, height: 160 },
    { x: 1071, y: 427, width: 90, height: 162 },
    { x: 1274, y: 436, width: 92, height: 153 },
    { x: 455, y: 645, width: 92, height: 149 },
    { x: 660, y: 644, width: 92, height: 150 },
    { x: 865, y: 642, width: 90, height: 152 },
    { x: 1070, y: 640, width: 90, height: 154 },
    { x: 1276, y: 639, width: 88, height: 155 },
    { x: 457, y: 843, width: 88, height: 156 },
    { x: 661, y: 843, width: 89, height: 156 },
    { x: 865, y: 844, width: 91, height: 155 },
    { x: 1070, y: 845, width: 91, height: 154 },
    { x: 1274, y: 847, width: 93, height: 152 },
  ],
  'kick.png': [
    { x: 42, y: 379, width: 112, height: 232 },
    { x: 257, y: 378, width: 119, height: 232 },
    { x: 439, y: 378, width: 129, height: 232 },
    { x: 639, y: 379, width: 134, height: 231 },
    { x: 844, y: 379, width: 202, height: 232 },
    { x: 1076, y: 379, width: 170, height: 232 },
    { x: 1294, y: 379, width: 113, height: 232 },
    { x: 1493, y: 379, width: 111, height: 232 },
  ],
  'climb.png': [
    { x: 26, y: 387, width: 120, height: 264 },
    { x: 235, y: 387, width: 133, height: 259 },
    { x: 442, y: 378, width: 127, height: 255 },
    { x: 655, y: 360, width: 114, height: 256 },
    { x: 857, y: 368, width: 179, height: 201 },
    { x: 1089, y: 382, width: 160, height: 171 },
    { x: 1323, y: 368, width: 129, height: 191 },
    { x: 1529, y: 349, width: 101, height: 210 },
  ],
  'dog_run.png': [
    { x: 28, y: 59, width: 470, height: 292 },
    { x: 540, y: 109, width: 474, height: 249 },
    { x: 1034, y: 96, width: 529, height: 228 },
    { x: 1587, y: 89, width: 475, height: 266 },
    { x: 13, y: 405, width: 464, height: 297 },
    { x: 535, y: 432, width: 480, height: 244 },
    { x: 1039, y: 429, width: 518, height: 229 },
    { x: 1579, y: 411, width: 485, height: 291 },
  ],
  'dog_enemy.png': [{ x: 147, y: 245, width: 1252, height: 549 }],
  'rat_idle.png': [
    { x: 85, y: 25, width: 624, height: 441 },
    { x: 845, y: 23, width: 633, height: 444 },
    { x: 86, y: 520, width: 624, height: 444 },
    { x: 850, y: 519, width: 628, height: 446 },
  ],
  'rat_run.png': [
<<<<<<< HEAD
    { x: 18, y: 140, width: 373, height: 304 },
    { x: 390, y: 140, width: 406, height: 304 },
    { x: 795, y: 140, width: 366, height: 305 },
    { x: 1160, y: 140, width: 363, height: 307 },
  ],
  'rat_jump.png': [
    { x: 34, y: 140, width: 449, height: 306 },
    { x: 515, y: 100, width: 536, height: 332 },
    { x: 1050, y: 32, width: 462, height: 382 },
    { x: 50, y: 517, width: 451, height: 439 },
    { x: 489, y: 575, width: 501, height: 348 },
    { x: 1034, y: 579, width: 479, height: 347 },
  ],
  'rat_attack.png': [
    { x: 70, y: 10, width: 766, height: 460 },
    { x: 836, y: 49, width: 794, height: 402 },
    { x: 36, y: 470, width: 800, height: 459 },
    { x: 836, y: 497, width: 800, height: 425 },
  ],
  'rat_block.png': [
    { x: 2, y: 58, width: 706, height: 454 },
    { x: 812, y: 18, width: 654, height: 494 },
    { x: 0, y: 512, width: 765, height: 470 },
    { x: 810, y: 512, width: 686, height: 464 },
=======
    { x: 16, y: 162, width: 409, height: 284 },
    { x: 392, y: 171, width: 423, height: 275 },
    { x: 799, y: 190, width: 383, height: 257 },
    { x: 1164, y: 186, width: 361, height: 263 },
  ],
  'rat_jump.png': [
    { x: 32, y: 184, width: 453, height: 264 },
    { x: 513, y: 131, width: 514, height: 303 },
    { x: 1059, y: 30, width: 455, height: 386 },
    { x: 487, y: 630, width: 505, height: 295 },
  ],
  'rat_attack.png': [
    { x: 109, y: 9, width: 633, height: 454 },
    { x: 809, y: 48, width: 823, height: 405 },
    { x: 35, y: 441, width: 824, height: 490 },
    { x: 964, y: 495, width: 674, height: 422 },
  ],
  'rat_block.png': [
    { x: 91, y: 58, width: 618, height: 413 },
    { x: 857, y: 16, width: 611, height: 464 },
    { x: 0, y: 463, width: 767, height: 511 },
    { x: 868, y: 496, width: 628, height: 480 },
>>>>>>> e8c0cb20009c65fd4cf5f49b27f746153ccc0b72
  ],
  'rat_boss.png': [{ x: 67, y: 75, width: 1273, height: 972 }],
};

function getAssetFileName(url: string): string | null {
  if (!url || typeof url !== 'string' || url.startsWith('data:')) return null;
  try {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const parts = cleanUrl.split('/');
    const last = parts[parts.length - 1];
    return last || null;
  } catch {
    return null;
  }
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

    const fileName = getAssetFileName(url);
    const known = fileName ? KNOWN_FRAMES[fileName] : null;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.image = img;
      this.frameHeight = img.naturalHeight || 64;
      this.retryCount = 0;

      // 1. If known standard asset with pre-calibrated frame rects, load immediately with guaranteed pixel accuracy
      if (known && known.length > 0 && (!explicitFrameCount || explicitFrameCount === known.length || known.length === 1)) {
        this.frames = known.map(f => ({ ...f }));
        this.frameCount = this.frames.length;
        this.frameWidth = this.frames[0].width;
        this.frameHeight = this.frames[0].height;
        this.isLoaded = true;
        return;
      }

      const targetCount = explicitFrameCount ?? this.config.frameCount;
      if (targetCount === 1) {
        try {
          const detected = this.detectFrames(img, 1);
          if (detected.length >= 1) {
            this.frames = detected;
            this.frameCount = 1;
            this.frameWidth = detected[0].width;
            this.frameHeight = detected[0].height;
            this.isLoaded = true;
            return;
          }
        } catch {
          // ignore
        }
        this.fallbackSlicing(img, 1);
        this.isLoaded = true;
        return;
      }

      // Extract frame bounding boxes via canvas pixel analysis or fallback slicing
      try {
        const detectedFrames = this.detectFrames(img, targetCount);
        if (detectedFrames.length >= 1) {
          this.frames = detectedFrames;
          this.frameCount = detectedFrames.length;
          this.frameWidth = detectedFrames[0].width;
          this.frameHeight = detectedFrames[0].height;
        } else {
          this.fallbackSlicing(img, targetCount || 5);
        }
      } catch (err) {
        console.warn('Canvas frame detection fallback:', err);
        this.fallbackSlicing(img, targetCount || 5);
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

  private detectConnectedFrames(data: Uint8ClampedArray, width: number, height: number): FrameRect[] {
    const visited = new Uint8Array(width * height);
    const rawBoxes: { minX: number; maxX: number; minY: number; maxY: number; w: number; h: number; count: number }[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (visited[idx] === 0 && data[idx * 4 + 3] > 25) {
          let minX = x;
          let maxX = x;
          let minY = y;
          let maxY = y;
          let count = 0;
          const queue = [x, y];
          visited[idx] = 1;
          let qHead = 0;

          while (qHead < queue.length) {
            const cx = queue[qHead++];
            const cy = queue[qHead++];
            count++;
            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;

            for (let dy = -4; dy <= 4; dy++) {
              const ny = cy + dy;
              if (ny < 0 || ny >= height) continue;
              for (let dx = -4; dx <= 4; dx++) {
                const nx = cx + dx;
                if (nx < 0 || nx >= width) continue;
                const nidx = ny * width + nx;
                if (visited[nidx] === 0 && data[nidx * 4 + 3] > 25) {
                  visited[nidx] = 1;
                  queue.push(nx, ny);
                }
              }
            }
          }

          if (count > 250) {
            rawBoxes.push({ minX, maxX, minY, maxY, w: maxX - minX + 1, h: maxY - minY + 1, count });
          }
        }
      }
    }

    if (rawBoxes.length === 0) return [];

    const merged: { minX: number; maxX: number; minY: number; maxY: number; w: number; h: number; count: number }[] = [];
    for (const box of rawBoxes) {
      let mergedInto: (typeof merged)[0] | null = null;
      for (const m of merged) {
        const overlapX = !(box.maxX < m.minX - 10 || box.minX > m.maxX + 10);
        const overlapY = !(box.maxY < m.minY - 10 || box.minY > m.maxY + 10);
        if (overlapX && overlapY) {
          mergedInto = m;
          break;
        }
      }
      if (mergedInto) {
        mergedInto.minX = Math.min(mergedInto.minX, box.minX);
        mergedInto.maxX = Math.max(mergedInto.maxX, box.maxX);
        mergedInto.minY = Math.min(mergedInto.minY, box.minY);
        mergedInto.maxY = Math.max(mergedInto.maxY, box.maxY);
        mergedInto.w = mergedInto.maxX - mergedInto.minX + 1;
        mergedInto.h = mergedInto.maxY - mergedInto.minY + 1;
        mergedInto.count += box.count;
      } else {
        merged.push({ ...box });
      }
    }

    // Sort top-to-bottom, left-to-right
    merged.sort((a, b) => {
      const aCenterY = a.minY + a.h / 2;
      const bCenterY = b.minY + b.h / 2;
      const rowThreshold = Math.min(a.h, b.h) * 0.45;
      if (Math.abs(aCenterY - bCenterY) > rowThreshold) {
        return aCenterY - bCenterY;
      }
      return a.minX - b.minX;
    });

    return merged.map(b => {
      const pad = 2;
      const fx = Math.max(0, b.minX - pad);
      const fy = Math.max(0, b.minY - pad);
      const fw = Math.min(width - fx, b.w + pad * 2);
      const fh = Math.min(height - fy, b.h + pad * 2);
      return { x: fx, y: fy, width: fw, height: fh };
    });
  }

  private detectProjectionFrames(data: Uint8ClampedArray, width: number, height: number, count?: number): FrameRect[] {
    const colCounts = new Array(width).fill(0);
    const rowCounts = new Array(height).fill(0);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4 + 3;
        if (data[idx] > 25) {
          colCounts[x]++;
          rowCounts[y]++;
        }
      }
    }

    // Find horizontal row bands
    const rowBands: { start: number; end: number }[] = [];
    let inRow = false;
    let rStart = 0;
    for (let y = 0; y < height; y++) {
      if (!inRow && rowCounts[y] > 20) {
        inRow = true;
        rStart = y;
      } else if (inRow && rowCounts[y] <= 20) {
        inRow = false;
        if (y - rStart > 30) rowBands.push({ start: rStart, end: y });
      }
    }
    if (inRow && height - rStart > 30) rowBands.push({ start: rStart, end: height });

    const frames: FrameRect[] = [];
    for (const rb of rowBands) {
      let inCol = false;
      let cStart = 0;
      for (let x = 0; x < width; x++) {
        let active = 0;
        for (let y = rb.start; y < rb.end; y++) {
          if (data[(y * width + x) * 4 + 3] > 25) active++;
        }
        if (!inCol && active > 10) {
          inCol = true;
          cStart = x;
        } else if (inCol && active <= 10) {
          inCol = false;
          if (x - cStart > 25) {
            frames.push({
              x: Math.max(0, cStart - 2),
              y: Math.max(0, rb.start - 2),
              width: Math.min(width - cStart + 2, x - cStart + 4),
              height: Math.min(height - rb.start + 2, rb.end - rb.start + 4),
            });
          }
        }
      }
      if (inCol && width - cStart > 25) {
        frames.push({
          x: Math.max(0, cStart - 2),
          y: Math.max(0, rb.start - 2),
          width: Math.min(width - cStart + 2, width - cStart + 2),
          height: Math.min(height - rb.start + 2, rb.end - rb.start + 4),
        });
      }
    }

    return frames;
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

    const targetCount = explicitFrameCount ?? this.config.frameCount;

    // 1. Try Connected Pixel Island Extraction first
    const connFrames = this.detectConnectedFrames(data, width, height);
    if (connFrames.length > 0) {
      if (targetCount === 1 && connFrames.length === 1) {
        return connFrames;
      }
      if (!targetCount || connFrames.length === targetCount) {
        return connFrames;
      }
      if (connFrames.length > 1 && (!targetCount || Math.abs(connFrames.length - targetCount) <= 2)) {
        return connFrames;
      }
    }

    // 2. Try Projection Slicing
    const projFrames = this.detectProjectionFrames(data, width, height, targetCount);
    if (projFrames.length > 0) {
      if (!targetCount || projFrames.length === targetCount || Math.abs(projFrames.length - targetCount) <= 2) {
        return projFrames;
      }
    }

    if (connFrames.length > 0) {
      return connFrames;
    }
    if (projFrames.length > 0) {
      return projFrames;
    }

    // 3. Equal-width fallback
    if (targetCount && targetCount > 1) {
      const fw = width / targetCount;
      const fallback: FrameRect[] = [];
      for (let i = 0; i < targetCount; i++) {
        fallback.push({ x: i * fw, y: 0, width: fw, height });
      }
      return fallback;
    }

    return [{ x: 0, y: 0, width, height }];
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

<<<<<<< HEAD
  public getCurrentFrameRect(): FrameRect | null {
    const idx = this.getCurrentFrameIndex();
    return this.frames[idx] || null;
  }

  /**
   * Proportional drawing: scales the frame according to a consistent reference source height,
   * keeping horizontal and vertical pixel density 1:1 with natural ground anchoring.
   */
  public drawProportional(
    ctx: CanvasRenderingContext2D,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    flipX: boolean = false,
    baseSourceHeight: number = 440
  ) {
    if (!this.isLoaded || !this.image) {
      this.drawFallbackCharacter(ctx, dx, dy, dw, dh, flipX);
      return;
    }

    const frame = this.getCurrentFrameRect() || {
      x: 0,
      y: 0,
      width: this.image.naturalWidth,
      height: this.image.naturalHeight,
    };

    const scale = dh / baseSourceHeight;
    const renderW = Math.round(frame.width * scale);
    const renderH = Math.round(frame.height * scale);

    // Center horizontally on dest box, anchor feet to bottom
    const renderX = Math.round(dx + (dw - renderW) / 2);
    const renderY = Math.round(dy + (dh - renderH));

    ctx.save();
    if (flipX) {
      ctx.translate(renderX + renderW / 2, renderY + renderH / 2);
      ctx.scale(-1, 1);
      ctx.drawImage(
        this.image,
        frame.x,
        frame.y,
        frame.width,
        frame.height,
        -renderW / 2,
        -renderH / 2,
        renderW,
        renderH
      );
    } else {
      ctx.drawImage(
        this.image,
        frame.x,
        frame.y,
        frame.width,
        frame.height,
        renderX,
        renderY,
        renderW,
        renderH
      );
    }
    ctx.restore();
  }

=======
>>>>>>> e8c0cb20009c65fd4cf5f49b27f746153ccc0b72
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

    let renderW: number;
    let renderH: number;
    const aspect = (sh > 0) ? (sw / sh) : 0.8;
    
    // Scale sprite to fit the target height while maintaining natural aspect ratio
    renderH = dh;
    renderW = Math.max(24, Math.round(dh * aspect));

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

