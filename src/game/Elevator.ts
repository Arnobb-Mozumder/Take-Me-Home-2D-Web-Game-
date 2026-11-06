import { Platform, Rect } from './types';
import { Player } from './Player';
import { Football } from './Football';
import { InputManager } from './InputManager';
import { DogEnemy } from './DogEnemy';

export type ElevatorState = 'IDLE_TOP' | 'DESCENDING' | 'IDLE_BOTTOM' | 'ASCENDING';
export type ElevatorAction = 'NONE' | 'RIDE_DOWN' | 'CALL_DOWN' | 'RIDE_UP' | 'CALL_UP';

export class Elevator implements Rect {
  public id = 'underground-elevator';
  public x: number;
  public y: number; // Current platform top Y
  public width: number = 130;
  public height: number = 22;

  public topFloorY: number; // Y level of ground on surface (e.g. 110)
  public bottomFloorY: number; // Y level of ground underground (e.g. 620)

  public state: ElevatorState = 'IDLE_TOP';
  public vy: number = 0;
  public travelSpeed: number = 260; // px/s
  public gearRotation: number = 0;
  public pulseTimer: number = 0;

  public arrivalCooldown: number = 0;
  public hasSteppedOffAfterArrival: boolean = true;
  public currentAction: ElevatorAction = 'NONE';

  // Visual prompt helper
  public showPrompt: boolean = false;
  private promptAlpha: number = 0;

  constructor(
    x: number = 7920,
    topFloorY: number = 110,
    bottomFloorY: number = 620
  ) {
    this.x = x;
    this.topFloorY = topFloorY;
    this.bottomFloorY = bottomFloorY;
    this.y = topFloorY;
  }

  public isTransitioning(): boolean {
    return this.state === 'DESCENDING' || this.state === 'ASCENDING';
  }

  public update(
    dt: number,
    player: Player,
    football: Football,
    input?: InputManager,
    dogs?: DogEnemy[]
  ): { isOperating: boolean; lockPlayer: boolean } {
    this.pulseTimer += dt * 4;
    if (this.arrivalCooldown > 0) {
      this.arrivalCooldown = Math.max(0, this.arrivalCooldown - dt);
    }

    // Check if player is standing on the elevator platform
    const playerFootY = player.y + player.height;
    const playerHorizOverlap = player.x + player.width > this.x && player.x < this.x + this.width;
    const playerOnPlatform =
      playerHorizOverlap && Math.abs(playerFootY - this.y) <= 22 && player.vy >= -40;

    // Track stepping off after arriving at destination floor
    if (!playerOnPlatform) {
      this.hasSteppedOffAfterArrival = true;
    }

    // Check if football is resting/bouncing on the platform
    const ballFootY = football.y + football.radius * 2;
    const ballHorizOverlap = football.x + football.radius * 2 > this.x && football.x < this.x + this.width;

    // Proximity to station call levers
    const distToPlayer = Math.abs((player.x + player.width / 2) - (this.x + this.width / 2));
    const distYToTopStation = Math.abs(playerFootY - this.topFloorY);
    const distYToBottomStation = Math.abs(playerFootY - this.bottomFloorY);

    const isNearTopStation = distToPlayer < 110 && distYToTopStation < 70;
    const isNearBottomStation = distToPlayer < 110 && distYToBottomStation < 70;

    // Determine current legal action - requires explicit step-on and [F] interaction
    this.currentAction = 'NONE';
    if (!this.isTransitioning() && this.arrivalCooldown <= 0) {
      if (this.state === 'IDLE_TOP') {
        if (playerOnPlatform && this.hasSteppedOffAfterArrival) {
          this.currentAction = 'RIDE_DOWN';
        } else if (isNearBottomStation) {
          this.currentAction = 'CALL_DOWN';
        }
      } else if (this.state === 'IDLE_BOTTOM') {
        if (playerOnPlatform && this.hasSteppedOffAfterArrival) {
          this.currentAction = 'RIDE_UP';
        } else if (isNearTopStation) {
          this.currentAction = 'CALL_UP';
        }
      }
    }

    if (this.currentAction !== 'NONE') {
      this.showPrompt = true;
      this.promptAlpha = Math.min(1, this.promptAlpha + dt * 6);
    } else {
      this.showPrompt = false;
      this.promptAlpha = Math.max(0, this.promptAlpha - dt * 4);
    }

    // Process Elevator Action via dedicated [F] key or [F] LIFT virtual button
    if (input && this.currentAction !== 'NONE' && this.arrivalCooldown <= 0) {
      if (input.consumeElevatorRequest()) {
        if (this.currentAction === 'RIDE_DOWN' || this.currentAction === 'CALL_DOWN') {
          this.state = 'DESCENDING';
          this.hasSteppedOffAfterArrival = false;
          player.showFloatingStatus('ELEVATOR DESCENDING ⬇️', '#38bdf8', '#0284c7');
        } else if (this.currentAction === 'RIDE_UP' || this.currentAction === 'CALL_UP') {
          this.state = 'ASCENDING';
          this.hasSteppedOffAfterArrival = false;
          player.showFloatingStatus('ELEVATOR ASCENDING ⬆️', '#4ade80', '#16a34a');
        }
      }
    }

    switch (this.state) {
      case 'IDLE_TOP': {
        this.y = this.topFloorY;
        this.vy = 0;
        break;
      }

      case 'DESCENDING': {
        this.vy = this.travelSpeed;
        const dy = this.vy * dt;
        this.y += dy;
        this.gearRotation += dt * 7;

        // Carry player smoothly with platform vertical velocity
        if (playerHorizOverlap && Math.abs(playerFootY - (this.y - dy)) <= 30 && player.vy >= -50) {
          player.y = this.y - player.height;
          player.vy = 0;
          player.isGrounded = true;
        }

        if (ballHorizOverlap && Math.abs(ballFootY - (this.y - dy)) <= 32 && football.vy >= -50) {
          football.y = this.y - football.radius * 2;
          football.vy = 0;
          football.isGrounded = true;
        }

        // Carry dogs smoothly with elevator
        if (dogs) {
          dogs.forEach(dog => {
            if (!dog.isDefeated && dog.state !== 'DEAD') {
              const dogFootY = dog.y + dog.height;
              const dogHorizOverlap = dog.x + dog.width > this.x && dog.x < this.x + this.width;
              if (dogHorizOverlap && Math.abs(dogFootY - (this.y - dy)) <= 32 && dog.vy >= -50) {
                dog.y = this.y - dog.height;
                dog.vy = 0;
                dog.isGrounded = true;
                dog.spawnX = dog.x;
                dog.spawnY = dog.y;
              }
            }
          });
        }

        if (this.y >= this.bottomFloorY) {
          this.y = this.bottomFloorY;
          this.vy = 0;
          this.state = 'IDLE_BOTTOM';
          this.arrivalCooldown = 0.8; // Stay parked at bottom floor
          this.hasSteppedOffAfterArrival = false;
        }
        break;
      }

      case 'IDLE_BOTTOM': {
        this.y = this.bottomFloorY;
        this.vy = 0;
        break;
      }

      case 'ASCENDING': {
        this.vy = -this.travelSpeed;
        const dy = this.vy * dt;
        this.y += dy;
        this.gearRotation -= dt * 7;

        // Carry player smoothly upward
        if (playerHorizOverlap && Math.abs(playerFootY - (this.y - dy)) <= 30 && player.vy >= -50) {
          player.y = this.y - player.height;
          player.vy = 0;
          player.isGrounded = true;
        }

        if (ballHorizOverlap && Math.abs(ballFootY - (this.y - dy)) <= 32 && football.vy >= -50) {
          football.y = this.y - football.radius * 2;
          football.vy = 0;
          football.isGrounded = true;
        }

        // Carry dogs smoothly upward with elevator
        if (dogs) {
          dogs.forEach(dog => {
            if (!dog.isDefeated && dog.state !== 'DEAD') {
              const dogFootY = dog.y + dog.height;
              const dogHorizOverlap = dog.x + dog.width > this.x && dog.x < this.x + this.width;
              if (dogHorizOverlap && Math.abs(dogFootY - (this.y - dy)) <= 32 && dog.vy >= -50) {
                dog.y = this.y - dog.height;
                dog.vy = 0;
                dog.isGrounded = true;
                dog.spawnX = dog.x;
                dog.spawnY = dog.y;
              }
            }
          });
        }

        if (this.y <= this.topFloorY) {
          this.y = this.topFloorY;
          this.vy = 0;
          this.state = 'IDLE_TOP';
          this.arrivalCooldown = 0.8; // Stay parked at top floor
          this.hasSteppedOffAfterArrival = false;
        }
        break;
      }
    }

    // Player is NEVER locked - full jumping, kicking, and movement remains active
    return { isOperating: this.isTransitioning(), lockPlayer: false };
  }

  // Returns solid platform for the moving elevator platform slab
  public toPlatform(): Platform {
    return {
      id: this.id + '-slab',
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
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

    if (drawX < -250 || drawX > 1365 + 250) return;

    ctx.save();

    // 0. Dark Inner Shaft Background (Vacant space cutout)
    const shaftHeight = (drawBottomY - drawTopY) + this.height + 40;
    ctx.fillStyle = '#050c1a';
    ctx.fillRect(drawX + 4, drawTopY, this.width - 8, shaftHeight);

    // Horizontal Steel Ribs / Girder Braces along the shaft depth
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    for (let sy = drawTopY + 40; sy < drawBottomY; sy += 50) {
      ctx.beginPath();
      ctx.moveTo(drawX + 4, sy);
      ctx.lineTo(drawX + this.width - 4, sy);
      ctx.stroke();

      // Cross Truss Bracing
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.beginPath();
      ctx.moveTo(drawX + 8, sy);
      ctx.lineTo(drawX + this.width - 8, sy + 50);
      ctx.stroke();
    }

    // 1. Vertical Heavy Steel Shaft Guide Rails (Left & Right)
    const railTopY = drawTopY - 120;
    const totalRailHeight = shaftHeight + 140;

    // Left Guide Rail Beam (I-Beam)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(drawX + 8, railTopY, 8, totalRailHeight);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(drawX + 10, railTopY, 4, totalRailHeight);

    // Right Guide Rail Beam
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(drawX + this.width - 16, railTopY, 8, totalRailHeight);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(drawX + this.width - 14, railTopY, 4, totalRailHeight);

    // Steel Suspension Cables from Overhead Winch down to Platform
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(drawX + 26, railTopY);
    ctx.lineTo(drawX + 26, drawY);
    ctx.moveTo(drawX + this.width - 26, railTopY);
    ctx.lineTo(drawX + this.width - 26, drawY);
    ctx.stroke();

    // 2. Surface Winch Gantry Header at the Top of Shaft
    const gantryY = drawTopY - 120;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(drawX - 12, gantryY - 16, this.width + 24, 20);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(drawX - 12, gantryY - 16, this.width + 24, 20);

    // Rotating Cog Gears
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

    drawGear(drawX + 26, gantryY - 6, 12);
    drawGear(drawX + this.width - 26, gantryY - 6, 12);

    // Gantry Signboard Badge
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(drawX + 10, gantryY - 36, this.width - 20, 18);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(drawX + 10, gantryY - 36, this.width - 20, 18);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 8.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SUBTERRANEAN LIFT', drawX + this.width / 2, gantryY - 24);

    // 3. MOVING LIFT PLATFORM (Open Sturdy Slab with Undercarriage)
    // Undercarriage Steel Support Truss & Hydraulic Pistons
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(drawX + 12, drawY + this.height);
    ctx.lineTo(drawX + 34, drawY + this.height + 18);
    ctx.lineTo(drawX + this.width - 34, drawY + this.height + 18);
    ctx.lineTo(drawX + this.width - 12, drawY + this.height);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Central Hydraulic Damper Cylinder
    ctx.fillStyle = '#475569';
    ctx.fillRect(drawX + this.width / 2 - 10, drawY + this.height + 2, 20, 22);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(drawX + this.width / 2 - 6, drawY + this.height + 24, 12, 12);

    // Main Platform Solid Slab Body
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(drawX, drawY, this.width, this.height);

    // Top Platform Tread Surface (Anti-Slip Diamond Tread)
    ctx.fillStyle = '#475569';
    ctx.fillRect(drawX + 2, drawY, this.width - 4, 6);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    for (let tx = drawX + 10; tx < drawX + this.width - 8; tx += 12) {
      ctx.beginPath();
      ctx.moveTo(tx, drawY + 1);
      ctx.lineTo(tx + 4, drawY + 5);
      ctx.stroke();
    }

    // Outer Platform Frame & Edge Chamfer
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(drawX, drawY, this.width, this.height);

    // Left & Right Safety Cable Anchor Brackets
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(drawX + 22, drawY - 6, 8, 8);
    ctx.fillRect(drawX + this.width - 30, drawY - 6, 8, 8);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(drawX + 22, drawY - 6, 8, 8);
    ctx.strokeRect(drawX + this.width - 30, drawY - 6, 8, 8);

    // 4. ANIMATED DIRECTIONAL STATUS INDICATOR ON PLATFORM FRONT
    const midX = drawX + this.width / 2;
    const midY = drawY + 12;
    const pulse = 0.6 + 0.4 * Math.sin(this.pulseTimer);

    if (this.state === 'DESCENDING') {
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(midX - 12, midY - 3);
      ctx.lineTo(midX, midY + 4);
      ctx.lineTo(midX + 12, midY - 3);
      ctx.stroke();

      ctx.fillStyle = `rgba(245, 158, 11, ${pulse * 0.5})`;
      ctx.fillRect(drawX + 12, drawY + 8, this.width - 24, 6);
    } else if (this.state === 'ASCENDING') {
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(midX - 12, midY + 4);
      ctx.lineTo(midX, midY - 3);
      ctx.lineTo(midX + 12, midY + 4);
      ctx.stroke();

      ctx.fillStyle = `rgba(34, 197, 94, ${pulse * 0.5})`;
      ctx.fillRect(drawX + 12, drawY + 8, this.width - 24, 6);
    } else if (this.state === 'IDLE_TOP') {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(midX, midY, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.state === 'IDLE_BOTTOM') {
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(midX, midY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. DRAW MECHANICAL CALL LEVER STATIONS AT BOTH FLOORS
    // Top Call Station (Surface: X = drawX - 24, Y = drawTopY)
    const topStationX = drawX - 24;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(topStationX, drawTopY - 32, 16, 32);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(topStationX, drawTopY - 32, 16, 32);

    // Call Station Indicator Light (Top)
    ctx.fillStyle = this.state === 'IDLE_TOP' ? '#38bdf8' : '#eab308';
    ctx.beginPath();
    ctx.arc(topStationX + 8, drawTopY - 22, 4, 0, Math.PI * 2);
    ctx.fill();

    // Bottom Call Station (Underground: X = drawX - 24, Y = drawBottomY)
    const bottomStationX = drawX - 24;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bottomStationX, drawBottomY - 32, 16, 32);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bottomStationX, drawBottomY - 32, 16, 32);

    // Call Station Indicator Light (Bottom)
    ctx.fillStyle = this.state === 'IDLE_BOTTOM' ? '#4ade80' : '#eab308';
    ctx.beginPath();
    ctx.arc(bottomStationX + 8, drawBottomY - 22, 4, 0, Math.PI * 2);
    ctx.fill();

    // 6. Interactive Floating Action Prompt (Shows [E]/[F] KEY PROMPT)
    if (this.promptAlpha > 0.01 && !this.isTransitioning()) {
      ctx.save();
      ctx.globalAlpha = this.promptAlpha;

      let actionText = '';
      let isDescendingAction = true;
      if (this.currentAction === 'RIDE_DOWN') {
        actionText = 'RIDE LIFT DOWN ⬇';
        isDescendingAction = true;
      } else if (this.currentAction === 'CALL_DOWN') {
        actionText = 'CALL LIFT DOWN ⬇';
        isDescendingAction = true;
      } else if (this.currentAction === 'RIDE_UP') {
        actionText = 'RIDE LIFT UP ⬆';
        isDescendingAction = false;
      } else if (this.currentAction === 'CALL_UP') {
        actionText = 'CALL LIFT UP ⬆';
        isDescendingAction = false;
      }

      if (!actionText) {
        ctx.restore();
        return;
      }

      // Decide target display Y based on where the elevator is
      const promptY = drawY - 42;
      const keyBoxW = 34;
      const keyBoxH = 20;
      const promptW = 210;
      const promptH = 30;
      const promptX = drawX + this.width / 2 - promptW / 2;

      // Glow backing
      ctx.shadowColor = isDescendingAction ? '#0284c7' : '#16a34a';
      ctx.shadowBlur = 10;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = isDescendingAction ? '#38bdf8' : '#4ade80';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(promptX, promptY, promptW, promptH, 6);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // [F] Key Tag
      const kX = promptX + 6;
      const kY = promptY + 5;
      ctx.fillStyle = isDescendingAction ? '#0284c7' : '#15803d';
      ctx.beginPath();
      ctx.roundRect(kX, kY, keyBoxW, keyBoxH, 4);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[F]', kX + keyBoxW / 2, kY + 14);

      // Action Label
      ctx.fillStyle = isDescendingAction ? '#e0f2fe' : '#dcfce7';
      ctx.font = 'bold 10.5px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(actionText, kX + keyBoxW + 8, promptY + 19);

      ctx.restore();
    }

    ctx.restore();
  }
}


