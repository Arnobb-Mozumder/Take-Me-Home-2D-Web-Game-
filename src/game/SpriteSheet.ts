import { SpriteConfig } from './types';

export class SpriteSheet {
  public image: HTMLImageElement | null = null;
  public isLoaded = false;
  public frameCount = 1;
  public frameWidth = 64;
  public frameHeight = 64;
  public frameDuration = 0.1; // Seconds per frame
  public loop = true;

  private elapsedTime = 0;
  private currentFrame = 0;
  private customFrameIndex: number | null = null;

  constructor(public config: SpriteConfig) {
    this.frameDuration = config.frameDuration;
    this.loop = config.loop;
    this.load(config.url, config.frameCount);
  }

  public load(url: string, explicitFrameCount?: number) {
    this.isLoaded = false;
    const img = new Image();
    img.src = url;
    img.onload = () => {
      this.image = img;
      this.frameHeight = img.naturalHeight || 64;
      
      if (explicitFrameCount && explicitFrameCount > 0) {
        this.frameCount = explicitFrameCount;
        this.frameWidth = img.naturalWidth / explicitFrameCount;
      } else if (this.config.frameWidth && this.config.frameWidth > 0) {
        this.frameWidth = this.config.frameWidth;
        this.frameCount = Math.max(1, Math.round(img.naturalWidth / this.frameWidth));
      } else {
        // Auto-detect based on width / height ratio
        const detected = Math.round(img.naturalWidth / (img.naturalHeight || 1));
        this.frameCount = Math.max(1, detected);
        this.frameWidth = img.naturalWidth / this.frameCount;
      }

      this.isLoaded = true;
    };
    img.onerror = () => {
      console.warn(`Failed to load sprite sheet from ${url}`);
    };
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
      // Fallback placeholder rectangle if loading
      ctx.fillStyle = 'rgba(255, 200, 50, 0.6)';
      ctx.fillRect(dx, dy, dw, dh);
      return;
    }

    const frameIdx = this.getCurrentFrameIndex();
    const sx = Math.floor(frameIdx * this.frameWidth);
    const sy = 0;
    const sw = this.frameWidth;
    const sh = this.frameHeight;

    ctx.save();

    if (flipX) {
      // Flip horizontally around the center of the destination rectangle
      ctx.translate(dx + dw / 2, dy + dh / 2);
      ctx.scale(-1, 1);
      ctx.drawImage(
        this.image,
        sx,
        sy,
        sw,
        sh,
        -dw / 2,
        -dh / 2,
        dw,
        dh
      );
    } else {
      ctx.drawImage(
        this.image,
        sx,
        sy,
        sw,
        sh,
        Math.floor(dx),
        Math.floor(dy),
        dw,
        dh
      );
    }

    ctx.restore();
  }
}
