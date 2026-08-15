import { Platform, Rect } from './types';
import { Player } from './Player';
import { Football } from './Football';

export type ElevatorState =
  | 'IDLE_TOP'
  | 'CLOSING_TOP'
  | 'DESCENDING'
  | 'OPENING_BOTTOM'
  | 'IDLE_BOTTOM'
  | 'CLOSING_BOTTOM'
  | 'ASCENDING'
  | 'OPENING_TOP';

export class Elevator implements Rect {
  public id = 'underground-elevator';
  public x: number;
  public y: number; // Current cabin top Y
  public width: number = 100;
  public height: number = 110;

  public topFloorY: number; // Y level of ground on surface (e.g. 110)
  public bottomFloorY: number; // Y level of ground underground (e.g. 1020)

  public state: ElevatorState = 'IDLE_TOP';
  public doorOpenProgress: number = 1; // 1 = fully open, 0 = fully closed
  public travelProgress: number = 0; // 0 = at top, 1 = at bottom
  public stateTimer: number = 0;
  public gearRotation: number = 0;

  // Visual prompt helper
  public showPrompt: boolean = false;
  private promptAlpha: number = 0;

  constructor(
    x: number = 7920,
    topFloorY: number = 110,
    bottomFloorY: number = 1020
  ) {
    this.x = x;
    this.topFloorY = topFloorY;
    this.bottomFloorY = bottomFloorY;
    this.y = topFloorY - this.height;
  }

  public isTransitioning(): boolean {
    return (
      this.state === 'CLOSING_TOP' ||
      this.state === 'DESCENDING' ||
      this.state === 'OPENING_BOTTOM' ||
      this.state === 'CLOSING_BOTTOM' ||
      this.state === 'ASCENDING' ||
      this.state === 'OPENING_TOP'
    );
  }

  public triggerEnter(player: Player, football: Football) {
    if (this.state === 'IDLE_TOP') {
      this.state = 'CLOSING_TOP';
      this.stateTimer = 0;
      // Position player and ball safely inside cabin
      player.x = this.x + this.width / 2 - player.width / 2;
      player.vx = 0;
      player.vy = 0;
      player.state = 'IDLE';

      football.x = this.x + this.width / 2 + 16;
      football.vx = 0;
      football.vy = 0;
      football.state = 'RESTING';
    } else if (this.state === 'IDLE_BOTTOM') {
      this.state = 'CLOSING_BOTTOM';
      this.stateTimer = 0;
      player.x = this.x + this.width / 2 - player.width / 2;
      player.vx = 0;
      player.vy = 0;
      player.state = 'IDLE';

      football.x = this.x + this.width / 2 + 16;
      football.vx = 0;
      football.vy = 0;
      football.state = 'RESTING';
    }
  }

  public update(dt: number, player: Player, football: Football): { isOperating: boolean; lockPlayer: boolean } {
    const topCabinY = this.topFloorY - this.height;
    const bottomCabinY = this.bottomFloorY - this.height;

    // Check player proximity to show prompt
    const cabinCenterX = this.x + this.width / 2;
    const distToPlayer = Math.abs((player.x + player.width / 2) - cabinCenterX);
    const playerAtTop = Math.abs((player.y + player.height) - this.topFloorY) < 30;
    const playerAtBottom = Math.abs((player.y + player.height) - this.bottomFloorY) < 30;

    if (
      (this.state === 'IDLE_TOP' && playerAtTop && distToPlayer < 80) ||
      (this.state === 'IDLE_BOTTOM' && playerAtBottom && distToPlayer < 80)
    ) {
      this.showPrompt = true;
      this.promptAlpha = Math.min(1, this.promptAlpha + dt * 4);

      // Auto-trigger elevator when player steps well inside cabin
      if (distToPlayer < 24 && (player.isGrounded || Math.abs(player.y + player.height - this.y - this.height) < 10)) {
        this.triggerEnter(player, football);
      }
    } else {
      this.showPrompt = false;
      this.promptAlpha = Math.max(0, this.promptAlpha - dt * 3);
    }

    let lockPlayer = false;

    switch (this.state) {
      case 'IDLE_TOP':
        this.y = topCabinY;
        this.doorOpenProgress = 1;
        this.travelProgress = 0;
        break;

      case 'CLOSING_TOP':
        lockPlayer = true;
        this.stateTimer += dt;
        this.doorOpenProgress = Math.max(0, 1 - this.stateTimer / 0.6);
        if (this.stateTimer >= 0.6) {
          this.state = 'DESCENDING';
          this.stateTimer = 0;
        }
        break;

      case 'DESCENDING': {
        lockPlayer = true;
        this.stateTimer += dt;
        const duration = 2.4; // 2.4s smooth elevator ride
        const rawProgress = Math.min(1, this.stateTimer / duration);
        // Smooth ease-in-out curve
        this.travelProgress = 0.5 - 0.5 * Math.cos(rawProgress * Math.PI);
        this.y = topCabinY + (bottomCabinY - topCabinY) * this.travelProgress;
        this.gearRotation += dt * 8;

        // Keep player and ball anchored inside moving elevator
        player.x = cabinCenterX - player.width / 2;
        player.y = this.y + this.height - player.height;
        player.vx = 0;
        player.vy = 0;
        player.isGrounded = true;

        football.x = cabinCenterX + 16;
        football.y = this.y + this.height - football.radius * 2;
        football.vx = 0;
        football.vy = 0;
        football.isGrounded = true;

        if (this.stateTimer >= duration) {
          this.y = bottomCabinY;
          this.state = 'OPENING_BOTTOM';
          this.stateTimer = 0;
        }
        break;
      }

      case 'OPENING_BOTTOM':
        lockPlayer = true;
        this.stateTimer += dt;
        this.doorOpenProgress = Math.min(1, this.stateTimer / 0.6);
        // Keep player on floor while opening
        player.y = this.bottomFloorY - player.height;
        football.y = this.bottomFloorY - football.radius * 2;
        if (this.stateTimer >= 0.6) {
          this.doorOpenProgress = 1;
          this.state = 'IDLE_BOTTOM';
          this.stateTimer = 0;
        }
        break;

      case 'IDLE_BOTTOM':
        this.y = bottomCabinY;
        this.doorOpenProgress = 1;
        this.travelProgress = 1;
        break;

      case 'CLOSING_BOTTOM':
        lockPlayer = true;
        this.stateTimer += dt;
        this.doorOpenProgress = Math.max(0, 1 - this.stateTimer / 0.6);
        if (this.stateTimer >= 0.6) {
          this.state = 'ASCENDING';
          this.stateTimer = 0;
        }
        break;

      case 'ASCENDING': {
        lockPlayer = true;
        this.stateTimer += dt;
        const duration = 2.4;
        const rawProgress = Math.min(1, this.stateTimer / duration);
        this.travelProgress = 1 - (0.5 - 0.5 * Math.cos(rawProgress * Math.PI));
        this.y = topCabinY + (bottomCabinY - topCabinY) * this.travelProgress;
        this.gearRotation -= dt * 8;

        player.x = cabinCenterX - player.width / 2;
        player.y = this.y + this.height - player.height;
        player.vx = 0;
        player.vy = 0;
        player.isGrounded = true;

        football.x = cabinCenterX + 16;
        football.y = this.y + this.height - football.radius * 2;
        football.vx = 0;
        football.vy = 0;
        football.isGrounded = true;

        if (this.stateTimer >= duration) {
          this.y = topCabinY;
          this.state = 'OPENING_TOP';
          this.stateTimer = 0;
        }
        break;
      }

      case 'OPENING_TOP':
        lockPlayer = true;
        this.stateTimer += dt;
        this.doorOpenProgress = Math.min(1, this.stateTimer / 0.6);
        player.y = this.topFloorY - player.height;
        football.y = this.topFloorY - football.radius * 2;
        if (this.stateTimer >= 0.6) {
          this.doorOpenProgress = 1;
          this.state = 'IDLE_TOP';
          this.stateTimer = 0;
        }
        break;
    }

    return { isOperating: this.isTransitioning(), lockPlayer };
  }

  // Returns solid platform for the elevator cabin floor
  public toPlatform(): Platform {
    return {
      id: this.id + '-floor',
      x: this.x,
      y: this.y + this.height - 4,
      width: this.width,
      height: 16,
      type: 'platform',
      color: '#334155',
      topColor: '#64748b',
    };
  }

  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y - cameraY);
    const drawTopY = Math.floor(this.topFloorY - cameraY);
    const drawBottomY = Math.floor(this.bottomFloorY - cameraY);

    if (drawX < -200 || drawX > 1365 + 200) return;

    ctx.save();

    // 1. Shaft Girders & Vertical Guide Rails
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(drawX + 6, drawTopY - 140, 6, (drawBottomY - drawTopY) + 140);
    ctx.fillRect(drawX + this.width - 12, drawTopY - 140, 6, (drawBottomY - drawTopY) + 140);

    // Steel Cables hanging from overhead pulley down to cabin
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(drawX + 30, drawTopY - 140);
    ctx.lineTo(drawX + 30, drawY);
    ctx.moveTo(drawX + this.width - 30, drawTopY - 140);
    ctx.lineTo(drawX + this.width - 30, drawY);
    ctx.stroke();

    // 2. Top Gantry Structure (Surface Winch & Pulley Wheels)
    const gantryY = drawTopY - 140;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(drawX - 10, gantryY - 18, this.width + 20, 22);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(drawX - 10, gantryY - 18, this.width + 20, 22);

    // Rotating Pulley Gears
    const drawGear = (gx: number, gy: number, radius: number) => {
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(this.gearRotation);
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * radius, Math.sin(ang) * radius);
        ctx.stroke();
      }
      ctx.restore();
    };

    drawGear(drawX + 30, gantryY, 14);
    drawGear(drawX + this.width - 30, gantryY, 14);

    // Gantry Signboard
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(drawX + 8, gantryY - 38, this.width - 16, 18);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(drawX + 8, gantryY - 38, this.width - 16, 18);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 8.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SUBTERRANEAN LIFT', drawX + this.width / 2, gantryY - 26);

    // 3. Elevator Cabin Body
    // Interior Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(drawX + 6, drawY + 6, this.width - 12, this.height - 12);

    // Back metal wall ribs
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    for (let bx = drawX + 16; bx < drawX + this.width - 10; bx += 16) {
      ctx.beginPath();
      ctx.moveTo(bx, drawY + 6);
      ctx.lineTo(bx, drawY + this.height - 6);
      ctx.stroke();
    }

    // Warm Brass Lantern inside cabin
    const lanternX = drawX + this.width / 2;
    const lanternY = drawY + 18;
    const glow = ctx.createRadialGradient(lanternX, lanternY, 4, lanternX, lanternY, 40);
    glow.addColorStop(0, 'rgba(250, 204, 21, 0.45)');
    glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lanternX, lanternY, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(lanternX - 4, lanternY - 4, 8, 8);

    // Cabin Structural Outer Frame (Dark Iron Beams)
    ctx.fillStyle = '#1e293b';
    // Roof
    ctx.fillRect(drawX, drawY, this.width, 10);
    // Floor
    ctx.fillRect(drawX, drawY + this.height - 10, this.width, 10);
    // Left & Right Pillars
    ctx.fillRect(drawX, drawY, 8, this.height);
    ctx.fillRect(drawX + this.width - 8, drawY, 8, this.height);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(drawX, drawY, this.width, this.height);

    // 4. Sliding Accordion Iron Mesh Doors (Animate based on doorOpenProgress)
    const doorHalfWidth = (this.width - 16) / 2;
    const leftDoorX = drawX + 8;
    const rightDoorX = drawX + this.width / 2;

    // When doorOpenProgress = 1 (open), door width compresses to 6px on sides
    // When doorOpenProgress = 0 (closed), door width is full doorHalfWidth
    const currentDoorWidth = doorHalfWidth * (1 - this.doorOpenProgress * 0.85);

    // Left Door Leaf
    ctx.fillStyle = '#334155';
    ctx.fillRect(leftDoorX, drawY + 10, currentDoorWidth, this.height - 20);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(leftDoorX, drawY + 10, currentDoorWidth, this.height - 20);
    // Door Mesh slats
    for (let my = drawY + 18; my < drawY + this.height - 14; my += 14) {
      ctx.beginPath();
      ctx.moveTo(leftDoorX, my);
      ctx.lineTo(leftDoorX + currentDoorWidth, my);
      ctx.stroke();
    }

    // Right Door Leaf
    const rDoorCurrentX = (drawX + this.width - 8) - currentDoorWidth;
    ctx.fillStyle = '#334155';
    ctx.fillRect(rDoorCurrentX, drawY + 10, currentDoorWidth, this.height - 20);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rDoorCurrentX, drawY + 10, currentDoorWidth, this.height - 20);
    for (let my = drawY + 18; my < drawY + this.height - 14; my += 14) {
      ctx.beginPath();
      ctx.moveTo(rDoorCurrentX, my);
      ctx.lineTo(rDoorCurrentX + currentDoorWidth, my);
      ctx.stroke();
    }

    // 5. Interactive Prompt Floating Badge (When player is near elevator)
    if (this.promptAlpha > 0.01 && !this.isTransitioning()) {
      ctx.save();
      ctx.globalAlpha = this.promptAlpha;

      const isTop = this.state === 'IDLE_TOP';
      const promptText = isTop ? '▼ ENTER ELEVATOR [E] / [WALK IN] ▼' : '▲ RETURN TO SURFACE [E] / [WALK IN] ▲';
      const promptW = 230;
      const promptH = 26;
      const promptX = drawX + this.width / 2 - promptW / 2;
      const promptY = drawY - 48;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = isTop ? '#38bdf8' : '#4ade80';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(promptX, promptY, promptW, promptH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(promptText, promptX + promptW / 2, promptY + 17);

      ctx.restore();
    }

    ctx.restore();
  }
}
