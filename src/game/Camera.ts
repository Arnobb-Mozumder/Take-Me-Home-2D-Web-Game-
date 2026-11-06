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
    // Keep player framed with strong forward lookahead (~26% from left edge) so player can see wide canal and opposite landing bank
    const idealX = playerX - this.viewWidth * 0.26;
    const maxX = Math.max(0, levelWidth - this.viewWidth);
    this.targetX = Math.max(0, Math.min(idealX, maxX));

    // Upward-biased camera Y:
    // Frames the boy slightly in the lower half (approx 68% down the screen),
    // giving plenty of upward headroom to see high obstacles, trajectory arcs, and overhead structures.
    const idealY = playerY - this.viewHeight * 0.68;
    const maxY = Math.max(0, levelHeight - this.viewHeight);
    // Allow camera to move upward to negative Y values (up to -150px) if needed for headroom
    this.targetY = Math.max(-150, Math.min(idealY, maxY));

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

