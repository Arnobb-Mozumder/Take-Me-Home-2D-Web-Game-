export class Camera {
  public x = 0;
  public y = 0;
  public targetX = 0;
  public targetY = 0;
  public lerpSpeed = 6; // Smooth camera interpolation speed

  public shakeTimer = 0;
  public shakeIntensity = 0;

  constructor(public viewWidth: number, public viewHeight: number) {}

  public resize(width: number, height: number) {
    this.viewWidth = width;
    this.viewHeight = height;
  }

  public addShake(intensity: number, duration: number) {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  public update(playerX: number, playerY: number, levelWidth: number, levelHeight: number, dt: number) {
    // Keep player centered at ~35% from left edge so player can see ahead
    const idealX = playerX - this.viewWidth * 0.35;
    const maxX = Math.max(0, levelWidth - this.viewWidth);
    this.targetX = Math.max(0, Math.min(idealX, maxX));

    // Smooth Y tracking keeping player in vertical view
    const idealY = playerY - this.viewHeight * 0.55;
    const maxY = Math.max(0, levelHeight - this.viewHeight);
    this.targetY = Math.max(0, Math.min(idealY, maxY));

    // Smooth Lerp Interpolation
    const lerpFactor = Math.min(1, dt * this.lerpSpeed);
    this.x += (this.targetX - this.x) * lerpFactor;
    this.y += (this.targetY - this.y) * lerpFactor;

    // Apply Screen Shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const shakeOffsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      const shakeOffsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      this.x += shakeOffsetX;
      this.y += shakeOffsetY;
    }
  }
}

