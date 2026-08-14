export class InputManager {
  private keys: Record<string, boolean> = {};
  private jumpRequested = false;
  private kickRequested = false;
  private aimRequested = false;
  private teleportRequested = false;
  private recallRequested = false;
  private virtualLeft = false;
  private virtualRight = false;
  private virtualJump = false;
  private virtualKick = false;
  private virtualAim = false;
  private virtualTeleport = false;
  private virtualRecall = false;
  private virtualUp = false;
  private virtualDown = false;

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  public destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Prevent default scrolling for game keys
    if (['Space', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyK', 'KeyF', 'KeyE', 'KeyR', 'KeyQ', 'KeyT', 'KeyC'].includes(e.code)) {
      if (document.activeElement === document.body || document.activeElement?.tagName === 'CANVAS') {
        e.preventDefault();
      }
    }

    if (!this.keys[e.code]) {
      if (e.code === 'ShiftLeft') {
        this.jumpRequested = true;
      }
      if (e.code === 'KeyK' || e.code === 'KeyF' || e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
        this.kickRequested = true;
      }
      if (e.code === 'KeyR') {
        this.aimRequested = true;
      }
      if (e.code === 'KeyQ' || e.code === 'KeyT') {
        this.teleportRequested = true;
      }
      if (e.code === 'KeyC') {
        this.recallRequested = true;
      }
    }

    this.keys[e.code] = true;
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  // Virtual buttons for mobile/touch
  public setVirtualLeft(active: boolean) {
    this.virtualLeft = active;
  }

  public setVirtualRight(active: boolean) {
    this.virtualRight = active;
  }

  public triggerVirtualJump() {
    this.virtualJump = true;
    this.jumpRequested = true;
  }

  public setVirtualJumpState(active: boolean) {
    if (active && !this.virtualJump) {
      this.jumpRequested = true;
    }
    this.virtualJump = active;
  }

  public setVirtualKickState(active: boolean) {
    if (active && !this.virtualKick) {
      this.kickRequested = true;
    }
    this.virtualKick = active;
  }

  public setVirtualUp(active: boolean) {
    this.virtualUp = active;
  }

  public setVirtualDown(active: boolean) {
    this.virtualDown = active;
  }

  public isLeftPressed(): boolean {
    return this.virtualLeft || !!this.keys['KeyA'] || !!this.keys['ArrowLeft'];
  }

  public isRightPressed(): boolean {
    return this.virtualRight || !!this.keys['KeyD'] || !!this.keys['ArrowRight'];
  }

  public isUpPressed(): boolean {
    return this.virtualUp || !!this.keys['KeyW'] || !!this.keys['ArrowUp'];
  }

  public isDownPressed(): boolean {
    return this.virtualDown || !!this.keys['KeyS'] || !!this.keys['ArrowDown'];
  }

  public isJumpPressed(): boolean {
    return this.virtualJump || !!this.keys['ShiftLeft'];
  }

  public isKickPressed(): boolean {
    return this.virtualKick || !!this.keys['KeyK'] || !!this.keys['KeyF'] || !!this.keys['KeyE'] || !!this.keys['Space'] || !!this.keys['Enter'];
  }

  public isAimPressed(): boolean {
    return this.virtualAim || !!this.keys['KeyR'];
  }

  // Consume a jump press request (buffering)
  public consumeJumpRequest(): boolean {
    if (this.jumpRequested) {
      this.jumpRequested = false;
      return true;
    }
    return false;
  }

  // Consume a kick press request
  public consumeKickRequest(): boolean {
    if (this.kickRequested) {
      this.kickRequested = false;
      return true;
    }
    return false;
  }

  public triggerVirtualTeleport() {
    this.teleportRequested = true;
  }

  public triggerVirtualRecall() {
    this.recallRequested = true;
  }

  // Consume an aim (R key) press request
  public consumeAimRequest(): boolean {
    if (this.aimRequested) {
      this.aimRequested = false;
      return true;
    }
    return false;
  }

  // Consume a teleport (Q/T key) press request
  public consumeTeleportRequest(): boolean {
    if (this.teleportRequested) {
      this.teleportRequested = false;
      return true;
    }
    return false;
  }

  // Consume a recall (C key) press request
  public consumeRecallRequest(): boolean {
    if (this.recallRequested) {
      this.recallRequested = false;
      return true;
    }
    return false;
  }
}

