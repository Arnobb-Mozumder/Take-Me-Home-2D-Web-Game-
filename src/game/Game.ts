import { Player } from './Player';
import { Football } from './Football';
import { Environment } from './Environment';
import { Camera } from './Camera';
import { Physics } from './Physics';
import { InputManager } from './InputManager';
import { GameDebugInfo, FootballDebugInfo, EnvironmentDebugInfo, Checkpoint, BreakableWall } from './types';

export class Game {
  public player: Player;
  public football: Football;
  public environment: Environment;
  public camera: Camera;
  public physics: Physics;
  public input: InputManager;

  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  private isRunning = false;
  private animationFrameId: number | null = null;
  private lastTime = 0;

  // Game State Machine & Respawn System
  public gameState: 'PLAYING' | 'BALL_LOST' | 'PLAYER_DIED' = 'PLAYING';
  private respawnTimer = 0;
  private fadeAlpha = 0;
  private activeCheckpoint: Checkpoint;

  // Debug options
  public showDebugBoxes = false;
  private fps = 60;
  private frameCount = 0;
  private lastFpsUpdate = 0;

  // Callback for debug UI updates
  private onDebugUpdate?: (info: GameDebugInfo) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;

    // Fixed internal game resolution: 1365 × 768
    this.canvas.width = 1365;
    this.canvas.height = 768;
    this.ctx.imageSmoothingEnabled = false;

    this.physics = new Physics();
    this.environment = new Environment();
    this.camera = new Camera(1365, 768);
    this.input = new InputManager();
    this.player = new Player(this.physics);

    // Initial Active Checkpoint
    this.activeCheckpoint = this.environment.checkpoints[0];

    // Spawn football at checkpoint spawn
    this.football = new Football(
      this.activeCheckpoint.ballSpawnX,
      this.activeCheckpoint.ballSpawnY
    );
    this.player.reset(
      this.activeCheckpoint.playerSpawnX,
      this.activeCheckpoint.playerSpawnY
    );
  }

  public setDebugCallback(callback: (info: GameDebugInfo) => void) {
    this.onDebugUpdate = callback;
  }

  public resize() {
    this.canvas.width = 1365;
    this.canvas.height = 768;
    this.ctx.imageSmoothingEnabled = false;
    this.camera.resize(1365, 768);
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.lastFpsUpdate = performance.now();
    this.loop(performance.now());
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public destroy() {
    this.stop();
    this.input.destroy();
  }

  private triggerBallLost(reason: 'water' | 'thorns' | 'cliff') {
    if (this.gameState !== 'PLAYING') return;

    this.gameState = 'BALL_LOST';
    this.respawnTimer = 1.3; // 1.3s transition
    this.camera.addShake(6, 0.3);

    if (reason === 'water') {
      this.environment.triggerWaterSplash(this.football.x, this.football.y);
    } else if (reason === 'thorns') {
      this.environment.triggerThornPop(this.football.x, this.football.y);
    }
  }

  private triggerPlayerDeath(reason: 'water' | 'thorns' | 'cliff') {
    if (this.gameState !== 'PLAYING') return;

    this.gameState = 'PLAYER_DIED';
    this.respawnTimer = 1.3;
    this.camera.addShake(8, 0.4);

    if (reason === 'water') {
      this.environment.triggerWaterSplash(this.player.x, this.player.y);
    } else if (reason === 'thorns') {
      this.environment.triggerThornPop(this.player.x, this.player.y);
    }
  }

  private respawnAtCheckpoint() {
    this.player.reset(
      this.activeCheckpoint.playerSpawnX,
      this.activeCheckpoint.playerSpawnY
    );
    this.football.reset(
      this.activeCheckpoint.ballSpawnX,
      this.activeCheckpoint.ballSpawnY
    );
    this.gameState = 'PLAYING';
    this.fadeAlpha = 0;
  }

  private loop = (currentTime: number) => {
    if (!this.isRunning) return;

    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    const dt = Math.min(0.05, rawDt);

    // FPS Calculation
    this.frameCount++;
    if (currentTime - this.lastFpsUpdate >= 500) {
      this.fps = (this.frameCount * 1000) / (currentTime - this.lastFpsUpdate);
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
    }

    if (this.gameState === 'PLAYING') {
      // 0. Teleport Input Check
      if (this.input.consumeTeleportRequest()) {
        this.attemptTeleport();
      }

      // 1. Environment & Objects Update
      this.environment.update(dt);

      // Collect platforms
      const cratePlatforms = this.environment.crates.map(c => c.toPlatform());
      const wallPlatforms = this.environment.breakableWalls
        .filter(w => !w.isBroken)
        .map(w => ({
          id: w.id,
          x: w.x,
          y: w.y,
          width: w.width,
          height: w.height,
          type: 'ground' as const,
          color: '#991b1b',
          topColor: '#b91c1c',
        }));

      const basePlatforms = [...this.environment.platforms, ...cratePlatforms];
      const playerPlatforms = [...basePlatforms, ...wallPlatforms];

      // Handle Crate Pushing by Player
      const playerBox = {
        x: this.player.x,
        y: this.player.y,
        width: this.player.width,
        height: this.player.height,
      };

      this.environment.crates.forEach(crate => {
        const crateBox = crate.getRect();
        if (this.physics.checkAABB(playerBox, crateBox)) {
          // Push crate if player is walking into it
          if (this.player.vx > 0 && playerBox.x < crateBox.x) {
            crate.push(this.player.vx);
          } else if (this.player.vx < 0 && playerBox.x > crateBox.x) {
            crate.push(this.player.vx);
          }
        }
      });

      // 2. Football Physics with Breakable Wall Collision Callback
      this.football.update(
        dt,
        basePlatforms,
        this.environment.breakableWalls,
        (wall: BreakableWall, impactSpeed: number) => {
          if (impactSpeed >= wall.breakThreshold) {
            // Shatter Breakable Brick Wall!
            this.environment.shatterWall(wall);
            this.camera.addShake(10, 0.4);
          } else {
            // Low / Medium power kick -> Shake wall & emit impact dust
            wall.shakeTimer = 0.3;
            this.environment.triggerImpactDust(this.football.x, this.football.y);
          }
        }
      );

      // 3. Player Physics & Input Update
      this.player.update(
        dt,
        this.input,
        playerPlatforms,
        this.environment.levelWidth,
        this.football
      );

      // 4. Checkpoint Trigger Check
      this.environment.checkpoints.forEach(cp => {
        if (!cp.isActive && this.player.x >= cp.x - 20) {
          cp.isActive = true;
          this.activeCheckpoint = cp;
          this.camera.addShake(3, 0.2);
        }
      });

      // 5. Check Hazards Intersections
      const playerHazardBox = {
        x: this.player.x,
        y: this.player.y,
        width: this.player.width,
        height: this.player.height,
      };

      const footBox = {
        x: this.football.x,
        y: this.football.y,
        width: this.football.radius * 2,
        height: this.football.radius * 2,
      };

      // Water Hazards Check
      for (const water of this.environment.waterZones) {
        if (this.physics.checkAABB(footBox, water)) {
          this.triggerBallLost('water');
          break;
        }
        if (this.physics.checkAABB(playerHazardBox, water)) {
          this.triggerPlayerDeath('water');
          break;
        }
      }

      // Thorn Hazards Check
      if (this.gameState === 'PLAYING') {
        for (const thorn of this.environment.thornHazards) {
          if (this.physics.checkAABB(footBox, thorn)) {
            this.triggerBallLost('thorns');
            break;
          }
          if (this.physics.checkAABB(playerHazardBox, thorn)) {
            const died = this.player.takeDamage(1);
            if (died) {
              this.triggerPlayerDeath('thorns');
            }
            break;
          }
        }
      }

      // Cliff Death Boundary Check
      if (this.gameState === 'PLAYING') {
        if (this.football.y > this.environment.deathBoundaryY) {
          this.triggerBallLost('cliff');
        } else if (this.player.y > this.environment.deathBoundaryY) {
          this.triggerPlayerDeath('cliff');
        }
      }

      // 6. Camera Follow
      this.camera.update(
        this.player.x,
        this.player.y,
        this.environment.levelWidth,
        this.environment.levelHeight,
        dt
      );
    } else {
      // Game Over / Ball Lost Respawn Animation
      this.respawnTimer -= dt;
      this.environment.update(dt);

      if (this.respawnTimer < 0.6) {
        this.fadeAlpha = Math.min(1, (0.6 - this.respawnTimer) / 0.6);
      }

      if (this.respawnTimer <= 0) {
        this.respawnAtCheckpoint();
      }
    }

    // Render Scene
    this.render();

    // Trigger Debug Callback
    if (this.onDebugUpdate) {
      this.onDebugUpdate({
        player: this.player.getDebugInfo(this.fps),
        football: this.getFootballDebugInfo(),
        environment: this.getEnvironmentDebugInfo(),
        gameState: this.gameState,
      });
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private getFootballDebugInfo(): FootballDebugInfo {
    const dist = this.player.getDistanceFromFootball(this.football);
    const kickDir = this.player.getKickDirection(this.input);
    const canKick = this.player.canKickBall(this.football) && this.player.kickCooldown <= 0;
    const powerVec = this.player.getKickVelocityVector(kickDir, this.player.kickPower);
    const estimatedKickSpeed = Math.round(Math.hypot(powerVec.vx, powerVec.vy));
    const kickPowerPercent = Math.round(this.player.kickPower * 100);

    return {
      x: Math.round(this.football.x),
      y: Math.round(this.football.y),
      vx: Math.round(this.football.vx),
      vy: Math.round(this.football.vy),
      isGrounded: this.football.isGrounded,
      state: this.football.state,
      distanceFromPlayer: dist,
      kickDirection: kickDir,
      canKick,
      kickCooldown: Math.round(this.player.kickCooldown * 100) / 100,
      lastImpactSpeed: this.football.lastImpactSpeed,
      kickPowerPercent,
      estimatedKickSpeed,
    };
  }

  private getEnvironmentDebugInfo(): EnvironmentDebugInfo {
    // Find nearest breakable wall
    let minWallDist = 9999;
    let targetWall: BreakableWall | null = null;

    this.environment.breakableWalls.forEach(wall => {
      if (!wall.isBroken) {
        const d = Math.abs(this.player.x - wall.x);
        if (d < minWallDist) {
          minWallDist = d;
          targetWall = wall;
        }
      }
    });

    // Check Water / Thorn Collision flags
    const pBox = { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height };
    const inWater = this.environment.waterZones.some(w => this.physics.checkAABB(pBox, w));
    const inThorns = this.environment.thornHazards.some(t => this.physics.checkAABB(pBox, t));

    let cliffStatus = 'SAFE';
    if (this.player.y > 520) cliffStatus = 'NEAR DROP';
    if (this.player.y > 600) cliffStatus = 'FALLING!';

    return {
      activeCheckpoint: this.activeCheckpoint.name,
      currentTerrain: this.player.isGrounded ? 'GRASS GROUND' : 'AIRBORNE',
      waterCollision: inWater,
      thornCollision: inThorns,
      cliffStatus,
      nearbyWallDistance: targetWall ? Math.round(minWallDist) : 0,
      wallImpactStrength: this.football.lastImpactSpeed,
      requiredWallBreakStrength: 450,
    };
  }

  private renderAimingIndicator() {
    const isAimingOrPower =
      (this.player.kickStage === 'AIM' || this.player.kickStage === 'POWER') &&
      this.gameState === 'PLAYING';

    const canKickPrompt =
      this.player.kickStage === 'NONE' &&
      this.player.canKickBall(this.football) &&
      this.player.kickCooldown <= 0 &&
      this.player.state !== 'KICK' &&
      this.gameState === 'PLAYING';

    if (!isAimingOrPower && !canKickPrompt) return;

    const kickDir = this.player.kickStage !== 'NONE' ? this.player.lockedKickDir : this.player.getKickDirection(this.input);
    const powerVec = this.player.getKickVelocityVector(kickDir, this.player.kickPower);
    const launchSpeed = Math.round(Math.hypot(powerVec.vx, powerVec.vy));
    const powerPct = Math.round(this.player.kickPower * 100);

    const startX = this.football.getCenterX() - this.camera.x;
    const startY = this.football.getCenterY();

    this.ctx.save();

    // 1. DYNAMIC PARABOLIC TRAJECTORY LINE WITH SPEED PROJECTION
    const g = this.football.gravity;
    const timeStep = 0.04;
    const maxSteps = Math.min(28, Math.round(12 + (this.player.kickPower * 16)));

    let prevX = startX;
    let prevY = startY;

    // Pulse factor for animation effect
    const now = performance.now();
    const dashOffset = (now * 0.05) % 16;

    this.ctx.lineWidth = 3.5;
    this.ctx.setLineDash([8, 6]);
    this.ctx.lineDashOffset = -dashOffset;

    // Stroke color based on stage and power
    const strokeStyle = this.player.kickStage === 'AIM'
      ? '#06b6d4' // Cyan for Aim stage
      : powerPct > 85
      ? '#ef4444' // Crimson Max
      : powerPct > 65
      ? '#f59e0b' // Amber High
      : '#10b981'; // Emerald Medium

    this.ctx.strokeStyle = strokeStyle;

    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);

    for (let step = 1; step <= maxSteps; step++) {
      const t = step * timeStep;
      const arcX = startX + powerVec.vx * t;
      const arcY = startY + powerVec.vy * t + 0.5 * g * t * t;

      // Stop trajectory line if it goes too far below ground level
      if (arcY > startY + 220) break;

      this.ctx.lineTo(arcX, arcY);
      prevX = arcX;
      prevY = arcY;
    }
    this.ctx.stroke();

    // Trajectory impact target reticle at endpoint
    this.ctx.setLineDash([]);
    this.ctx.fillStyle = strokeStyle;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1.5;

    this.ctx.beginPath();
    this.ctx.arc(prevX, prevY, 6, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Inner reticle pulse
    const ringPulse = 8 + Math.sin(now * 0.012) * 3;
    this.ctx.strokeStyle = strokeStyle;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(prevX, prevY, ringPulse, 0, Math.PI * 2);
    this.ctx.stroke();

    // 2. FLOATING SPEED METER GAUGE HUD ABOVE FOOTBALL
    const meterX = startX;
    const meterY = startY - 62;
    const meterWidth = 162;
    const meterHeight = 46;

    // Background Card Panel
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    this.ctx.strokeStyle = this.player.kickStage === 'POWER' ? '#f59e0b' : this.player.kickStage === 'AIM' ? '#06b6d4' : 'rgba(51, 65, 85, 0.8)';
    this.ctx.lineWidth = this.player.kickStage !== 'NONE' ? 2 : 1;

    // Glow effect if aiming or charging
    if (this.player.kickStage !== 'NONE') {
      this.ctx.shadowColor = this.player.kickStage === 'POWER' ? 'rgba(245, 158, 11, 0.6)' : 'rgba(6, 182, 212, 0.6)';
      this.ctx.shadowBlur = 12;
    }

    this.ctx.beginPath();
    this.ctx.roundRect(meterX - meterWidth / 2, meterY - meterHeight / 2, meterWidth, meterHeight, 10);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.shadowBlur = 0; // Reset shadow

    // Header: Direction Name & Speed Reading
    this.ctx.font = 'bold 10px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.fillText(kickDir.replace('_', ' '), meterX - meterWidth / 2 + 8, meterY - 10);

    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#fef08a';
    this.ctx.fillText(`${launchSpeed} px/s`, meterX + meterWidth / 2 - 8, meterY - 10);

    // Speed Gauge Bar Track
    const barX = meterX - meterWidth / 2 + 8;
    const barY = meterY + 2;
    const barW = meterWidth - 16;
    const barH = 10;

    this.ctx.fillStyle = '#1e293b';
    this.ctx.beginPath();
    this.ctx.roundRect(barX, barY, barW, barH, 4);
    this.ctx.fill();

    // Speed Gauge Bar Filler (Gradient)
    const fillW = Math.max(8, Math.round((barW * powerPct) / 100));
    const barGrad = this.ctx.createLinearGradient(barX, barY, barX + barW, barY);
    barGrad.addColorStop(0, '#06b6d4'); // Cyan
    barGrad.addColorStop(0.5, '#10b981'); // Emerald Green
    barGrad.addColorStop(0.8, '#f59e0b'); // Amber
    barGrad.addColorStop(1.0, '#ef4444'); // Crimson Red

    this.ctx.fillStyle = barGrad;
    this.ctx.beginPath();
    this.ctx.roundRect(barX, barY, fillW, barH, 4);
    this.ctx.fill();

    // Indicator Needle / Pulse Line
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(barX + fillW - 2, barY - 2, 3, barH + 4);

    // Footer Text Instructions
    this.ctx.font = 'bold 9px system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    if (this.player.kickStage === 'AIM') {
      this.ctx.fillStyle = '#67e8f9';
      this.ctx.fillText(`AIM (WASD) • PRESS KICK FOR POWER 🎯`, meterX, meterY + 18);
    } else if (this.player.kickStage === 'POWER') {
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.fillText(`POWER: ${powerPct}% • PRESS KICK TO LAUNCH! ⚡`, meterX, meterY + 18);
    } else {
      this.ctx.fillStyle = '#fde047';
      this.ctx.fillText(`PRESS KICK BUTTON TO AIM ⚽`, meterX, meterY + 18);
    }

    this.ctx.restore();
  }

  private renderHUD() {
    const { width } = this.canvas;
    this.ctx.save();

    // Health Hearts in Top Right
    const startX = width - 110;
    const startY = 24;

    this.ctx.font = 'bold 12px monospace';
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.fillText('HEALTH:', startX - 60, startY + 12);

    for (let i = 0; i < this.player.maxHealth; i++) {
      const hX = startX + i * 22;
      const isFull = i < this.player.health;

      this.ctx.fillStyle = isFull ? '#ef4444' : '#475569';
      this.ctx.beginPath();
      this.ctx.arc(hX, startY, 6, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Active Checkpoint HUD Indicator (Top Center)
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.lineWidth = 1.5;

    const cpText = `🚩 CHECKPOINT: ${this.activeCheckpoint.name.toUpperCase()}`;
    this.ctx.font = 'bold 11px sans-serif';
    const cpWidth = this.ctx.measureText(cpText).width;

    this.ctx.beginPath();
    this.ctx.roundRect(width / 2 - cpWidth / 2 - 12, 12, cpWidth + 24, 26, 13);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#38bdf8';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(cpText, width / 2, 25);

    this.ctx.restore();
  }

  public canTeleportToBall(): { allowed: boolean; reason?: string } {
    // 1. Teleport Cooldown check
    if (this.player.teleportCooldown > 0) {
      return { allowed: false, reason: `TELEPORT COOLDOWN (${this.player.teleportCooldown.toFixed(1)}s)` };
    }

    // 2. Ball Speed check (< 80 px/s)
    const ballSpeed = Math.hypot(this.football.vx, this.football.vy);
    if (ballSpeed >= 80) {
      return { allowed: false, reason: `BALL MOVING TOO FAST (${Math.round(ballSpeed)} px/s >= 80)` };
    }

    // 3. Ball on Stable Terrain check
    if (!this.football.isGrounded && Math.abs(this.football.vy) > 20) {
      return { allowed: false, reason: 'BALL IS AIRBORNE (MUST BE ON STABLE TERRAIN)' };
    }

    // 4. Ball in Hazard check
    const footBox = {
      x: this.football.x,
      y: this.football.y,
      width: this.football.radius * 2,
      height: this.football.radius * 2,
    };

    for (const water of this.environment.waterZones) {
      if (this.physics.checkAABB(footBox, water)) {
        return { allowed: false, reason: 'BALL IS IN WATER HAZARD' };
      }
    }

    for (const thorn of this.environment.thornHazards) {
      if (this.physics.checkAABB(footBox, thorn)) {
        return { allowed: false, reason: 'BALL IS IN THORN HAZARD' };
      }
    }

    if (this.football.y > this.environment.deathBoundaryY) {
      return { allowed: false, reason: 'BALL OUT OF BOUNDS' };
    }

    // 5. Destination space check (Player must fit in destination space)
    const targetX = this.football.x + this.football.radius - this.player.width / 2;
    const targetY = this.football.y + this.football.radius * 2 - this.player.height;

    const destPlayerBox = {
      x: targetX,
      y: targetY,
      width: this.player.width,
      height: this.player.height,
    };

    const wallPlatforms = this.environment.breakableWalls
      .filter(w => !w.isBroken)
      .map(w => ({ id: w.id, x: w.x, y: w.y, width: w.width, height: w.height }));
    const cratePlatforms = this.environment.crates.map(c => c.toPlatform());
    const allPlats = [...this.environment.platforms, ...wallPlatforms, ...cratePlatforms];

    for (const plat of allPlats) {
      if (this.physics.checkAABB(destPlayerBox, plat)) {
        return { allowed: false, reason: 'DESTINATION PASSAGE TOO NARROW FOR BOY' };
      }
    }

    return { allowed: true };
  }

  public attemptTeleport() {
    const check = this.canTeleportToBall();
    if (check.allowed) {
      // Particle burst at origin player location
      this.environment.spawnTeleportBurst(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2
      );

      // Perform teleport
      this.player.teleportToBall(this.football);

      // Particle burst at destination player location
      this.environment.spawnTeleportBurst(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2
      );

      // Set cooldown
      this.player.teleportCooldown = 0.8;

      // Visual camera shake and floating badge
      this.camera.addShake(4, 0.2);
      this.player.showFloatingStatus('TELEPORT! ⚡', '#f0abfc', '#a855f7');
    } else if (check.reason) {
      // Show error status badge above player
      this.player.showFloatingStatus(check.reason, '#fca5a5', '#dc2626');
    }
  }

  private renderOverlayBanners() {
    if (this.gameState === 'PLAYING' && this.fadeAlpha === 0) return;

    const { width, height } = this.canvas;
    this.ctx.save();

    // Fade to Black overlay
    if (this.fadeAlpha > 0) {
      this.ctx.fillStyle = `rgba(15, 23, 42, ${this.fadeAlpha})`;
      this.ctx.fillRect(0, 0, width, height);
    }

    // Game Over / Ball Lost Banner Modal
    if (this.gameState !== 'PLAYING') {
      const isBall = this.gameState === 'BALL_LOST';

      // Banner Container Card
      const cardW = 340;
      const cardH = 130;
      const cardX = width / 2 - cardW / 2;
      const cardY = height / 2 - cardH / 2;

      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      this.ctx.strokeStyle = isBall ? '#f59e0b' : '#ef4444';
      this.ctx.lineWidth = 2.5;

      this.ctx.beginPath();
      this.ctx.roundRect(cardX, cardY, cardW, cardH, 16);
      this.ctx.fill();
      this.ctx.stroke();

      // Main Title
      this.ctx.font = '900 28px system-ui, sans-serif';
      this.ctx.fillStyle = isBall ? '#fbbf24' : '#f87171';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(isBall ? '⚽ BALL LOST!' : '💔 TRY AGAIN!', width / 2, cardY + 22);

      // Subtitle
      this.ctx.font = '500 13px system-ui, sans-serif';
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.fillText(`Respawning at ${this.activeCheckpoint.name}...`, width / 2, cardY + 68);

      // Tip / Requirement Banner
      this.ctx.font = 'bold 11px monospace';
      this.ctx.fillStyle = isBall ? '#fef08a' : '#fca5a5';
      this.ctx.fillText(
        isBall ? 'Use high power kick to clear gaps & walls!' : 'Watch out for deep water & thorn bushes!',
        width / 2,
        cardY + 92
      );
    }

    this.ctx.restore();
  }

  private render() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // 1. Render Background with 4 Parallax Layers
    this.environment.renderBackground(this.ctx, this.camera.x, width, height);

    // 2. Render Foreground (Platforms, Trees, Water, Thorns, Checkpoints)
    this.environment.renderForeground(this.ctx, this.camera.x, width);

    // 3. Render Football
    this.football.render(this.ctx, this.camera.x, this.showDebugBoxes);

    // 4. Render Aiming Indicator when in kick range
    this.renderAimingIndicator();

    // 5. Render Player
    this.player.render(this.ctx, this.camera.x, this.showDebugBoxes);

    // 6. Render HUD (Health & Checkpoint)
    this.renderHUD();

    // 7. Render Overlay Banners (Ball Lost / Try Again / Fade)
    this.renderOverlayBanners();
  }
}
