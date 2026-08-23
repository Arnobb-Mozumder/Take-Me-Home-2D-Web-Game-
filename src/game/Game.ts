import { Player } from './Player';
import { Football } from './Football';
import { Environment } from './Environment';
import { Camera } from './Camera';
import { Physics } from './Physics';
import { InputManager } from './InputManager';
import { SaveManager, SavedGameState } from './SaveManager';
import { RatkeeperBoss } from './RatkeeperBoss';
import { GameDebugInfo, FootballDebugInfo, EnvironmentDebugInfo, Checkpoint, BreakableWall, KickDirection, Platform } from './types';

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
  public gameState: 'PLAYING' | 'BALL_LOST' | 'PLAYER_DIED' | 'LEVEL_TRANSITION' = 'PLAYING';
  private respawnTimer = 0;
  private fadeAlpha = 0;
  private activeCheckpoint: Checkpoint;

  // Level Transition
  public transitionState: 'NONE' | 'FADING_OUT' | 'BLACK_SCREEN' | 'FADING_IN' = 'NONE';
  public transitionTimer = 0;
  public transitionTargetLevel = 1;
  public transitionTitle = '';
  public transitionSubtitle = '';
  public transitionSpawnAtEnd = false;
  public transitionSpawnCheckpointId?: string;
  public chapterBannerTimer = 0;

  // Persistence and Auto-save System
  private autoSaveTimer = 0;
  private lastSavedTime = 0;
  private hasSavedGame = false;
  private saveToastTimer = 0;
  private saveToastMessage = '';

  // Debug options
  public showDebugBoxes = false;
  private fps = 60;
  private frameCount = 0;
  private lastFpsUpdate = 0;

  // Callback for debug UI updates
  private onDebugUpdate?: (info: GameDebugInfo) => void;

  constructor(canvas: HTMLCanvasElement, initialWidth: number = 1365, initialHeight: number = 768) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;

    // Full screen matching resolution (supports standard/ultrawide/hi-dpi containers)
    const w = Math.max(800, initialWidth);
    const h = Math.max(500, initialHeight);
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.imageSmoothingEnabled = false;

    this.physics = new Physics();
    this.environment = new Environment();
    this.camera = new Camera(w, h);
    this.input = new InputManager();
    this.player = new Player(this.physics);

    // Initial Active Checkpoint
    this.activeCheckpoint = this.environment.checkpoints[0];

    // Check for existing saved game progress in localStorage
    const saved = SaveManager.loadGameState();
    if (saved) {
      this.hasSavedGame = true;
      this.lastSavedTime = saved.timestamp;

      // Load saved level if specified
      if (saved.level && saved.level !== this.environment.currentLevel) {
        this.environment.loadLevel(saved.level);
      }

      // Restore active checkpoint
      const cp = this.environment.checkpoints.find(c => c.id === saved.checkpointId);
      if (cp) {
        this.activeCheckpoint = cp;
        // Mark all checkpoints up to this one as active
        let reached = false;
        this.environment.checkpoints.forEach(c => {
          if (!reached) {
            c.isActive = true;
            if (c.id === cp.id) reached = true;
          }
        });
      } else {
        this.activeCheckpoint = this.environment.checkpoints[0];
      }

      // Restore broken walls
      if (Array.isArray(saved.brokenWallIds)) {
        this.environment.breakableWalls.forEach(wall => {
          if (saved.brokenWallIds.includes(wall.id)) {
            wall.isBroken = true;
          }
        });
      }

      // Restore crates
      if (Array.isArray(saved.crates)) {
        saved.crates.forEach(sc => {
          const crate = this.environment.crates.find(c => c.id === sc.id);
          if (crate) {
            crate.x = sc.x;
            crate.y = sc.y;
          }
        });
      }

      // Restore Player and Football positions
      this.football = new Football(saved.football.x, saved.football.y);
      this.player.reset(saved.player.x, saved.player.y);
      this.player.facingRight = saved.player.facingRight;
      this.player.health = Math.max(1, saved.player.health);
    } else {
      // Spawn football at initial checkpoint spawn
      this.football = new Football(
        this.activeCheckpoint.ballSpawnX,
        this.activeCheckpoint.ballSpawnY
      );
      this.player.reset(
        this.activeCheckpoint.playerSpawnX,
        this.activeCheckpoint.playerSpawnY
      );
    }
  }

  public setDebugCallback(callback: (info: GameDebugInfo) => void) {
    this.onDebugUpdate = callback;
  }

  public resize(width?: number, height?: number) {
    const w = width && width > 0 ? width : this.canvas.clientWidth || 1365;
    const h = height && height > 0 ? height : this.canvas.clientHeight || 768;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.imageSmoothingEnabled = false;
    this.camera.resize(w, h);
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

  public startLevelTransition(
    targetLevel: number,
    title: string = 'CHAPTER 2: THE JUNGLE RUSH',
    subtitle: string = 'Entering the Wild Canopy...',
    spawnAtEnd: boolean = false,
    spawnCheckpointId?: string
  ) {
    if (this.gameState === 'LEVEL_TRANSITION') return;

    this.gameState = 'LEVEL_TRANSITION';
    this.transitionState = 'FADING_OUT';
    this.transitionTimer = 0;
    this.transitionTargetLevel = targetLevel;
    this.transitionTitle = title;
    this.transitionSubtitle = subtitle;
    this.transitionSpawnAtEnd = spawnAtEnd;
    this.transitionSpawnCheckpointId = spawnCheckpointId;
    this.camera.addShake(4, 0.4);
  }

  public switchLevel(levelNum: number) {
    this.startLevelTransition(
      levelNum,
      levelNum === 2 ? 'CHAPTER 2: THE JUNGLE RUSH' : 'CHAPTER 1: THE SUBURBIA RUN',
      levelNum === 2 ? 'Entering the Wild Canopy...' : 'Returning to Suburbia...',
      levelNum === 1
    );
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

  private triggerPlayerDeath(reason: 'water' | 'thorns' | 'cliff' | 'dog' | 'boss') {
    if (this.gameState !== 'PLAYING') return;

    this.gameState = 'PLAYER_DIED';
    this.respawnTimer = 1.3;
    this.camera.addShake(8, 0.4);

    if (reason === 'water') {
      this.environment.triggerWaterSplash(this.player.x, this.player.y);
    } else if (reason === 'thorns') {
      this.environment.triggerThornPop(this.player.x, this.player.y);
    } else if (reason === 'dog' || reason === 'boss') {
      this.environment.triggerImpactDust(this.player.x, this.player.y);
    }
  }

  public handleBossDefeat() {
    this.environment.isBossDefeated = true;
    SaveManager.setBossDefeated(true);
    SaveManager.setStoneGateOpen(true);

    if (this.environment.bossArena) {
      this.environment.bossArena.onBossDefeated(this.player);
      this.environment.bossArena.elevatedPlatforms = [];
    }

    if (this.environment.stoneGate) {
      this.environment.stoneGate.unlock();
    }

    if (this.environment.ratkeeperBoss) {
      this.environment.ratkeeperBoss.isDefeated = true;
    }

    // Open Exit Hollow Tunnel at the entrance behind the player (X: 40-200)
    if (!this.environment.cavePortals.some(p => p.id === 'tunnel-return-to-jungle')) {
      this.environment.cavePortals.push({
        id: 'tunnel-return-to-jungle',
        x: 40,
        y: 460,
        width: 160,
        height: 160,
        targetLevel: 2,
        title: 'CHAPTER 2: JUNGLE CANOPY',
        subtitle: 'Returning through the hollow tunnel to the catacombs...',
        spawnCheckpointId: 'jungle-cp-ratkeeper-antechamber',
        signText: '💀 HOLLOW TUNNEL ➔ RETURN TO CATACOMBS',
      });
    }

    this.saveGameProgress(true, '👑 The Ratkeeper has fallen! Catacombs Unlocked.');
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
    this.environment.dogs.forEach(d => d.reset());
    this.environment.healthPotions.forEach(p => p.reset());
    if (this.environment.bossArena && !this.environment.bossArena.isDefeated) {
      this.environment.bossArena.reset();
      if (this.environment.ratkeeperBoss) {
        this.environment.ratkeeperBoss = new RatkeeperBoss(1200, 380, this.environment.bossArena);
      }
    }
    if (this.environment.elevator && this.activeCheckpoint.id === 'jungle-cp-ratkeeper-antechamber') {
      this.environment.elevator.state = 'IDLE_BOTTOM';
      this.environment.elevator.y = this.environment.elevator.bottomFloorY;
      this.environment.elevator.vy = 0;
    }
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
      if (this.input.consumeRecallRequest()) {
        this.recallBall();
      }

      // 1. Environment & Objects Update
      this.environment.update(dt);

      // Update Subterranean Elevator & Ancient Stone Gate & Boss Arena if active in level
      let lockPlayerForElevator = false;
      if (this.environment.elevator) {
        const elevRes = this.environment.elevator.update(
          dt,
          this.player,
          this.football,
          this.input,
          this.environment.dogs
        );
        lockPlayerForElevator = elevRes.lockPlayer;
      }
      if (this.environment.stoneGate) {
        this.environment.stoneGate.update(dt, this.player, this.football);
      }
      if (this.environment.bossArena) {
        if (!this.environment.bossArena.onStartEncounter) {
          this.environment.bossArena.onStartEncounter = () => {
            if (this.environment.ratkeeperBoss && this.environment.ratkeeperBoss.state === 'IDLE_STANCE') {
              this.environment.ratkeeperBoss.setState('INTRO');
            }
          };
        }
        this.environment.bossArena.update(dt, this.player, this.football);
      }

      // Collect platforms
      const cratePlatforms = this.environment.crates.map(c => c.toPlatform());
      const dynamicPlatforms: Platform[] = [];
      if (this.environment.elevator) {
        dynamicPlatforms.push(this.environment.elevator.toPlatform());
      }
      if (this.environment.stoneGate) {
        const gatePlat = this.environment.stoneGate.toPlatform();
        if (gatePlat) dynamicPlatforms.push(gatePlat);
      }
      if (this.environment.bossArena) {
        dynamicPlatforms.push(...this.environment.bossArena.toPlatforms());
      }

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

      const basePlatforms = [...this.environment.platforms, ...cratePlatforms, ...dynamicPlatforms];
      const playerPlatforms = [...basePlatforms, ...wallPlatforms];

      // Level 2 Spatial Partitioning: Ensure underground catacombs entities (X: 5750 to 9800, Y > 380)
      // do not collide with surface ascent platforms or surface ground slabs situated far overhead,
      // and surface entities do not collide with underground boss room ceiling.
      const getActivePlatformsForEntity = (entityX: number, entityY: number, platformsList: Platform[]) => {
        if (this.environment.currentLevel !== 2) return platformsList;
        const isUnderground = entityY > 380 && entityX >= 5750 && entityX <= 9800;
        if (isUnderground) {
          // Underground: ignore surface ascent platforms and summit ground slabs situated in the sky/surface
          return platformsList.filter(p => {
            if (p.id.startsWith('jungle-ascent-') || p.id.startsWith('jungle-summit-')) {
              return false;
            }
            return true;
          });
        } else {
          // Surface: ignore subterranean arena colliders & underground platforms
          return platformsList.filter(p => {
            if (
              p.id.startsWith('arena-') ||
              p.id.startsWith('jungle-boss-') ||
              p.id.startsWith('jungle-underground-')
            ) {
              return false;
            }
            return true;
          });
        }
      };

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
      const activeFootballPlatforms = getActivePlatformsForEntity(this.football.x, this.football.y, basePlatforms);
      this.football.update(
        dt,
        activeFootballPlatforms,
        this.environment.breakableWalls,
        (wall: BreakableWall, impactSpeed: number) => {
          if (impactSpeed >= wall.breakThreshold) {
            // Shatter Breakable Brick Wall!
            this.environment.shatterWall(wall);
            this.camera.addShake(10, 0.4);
            // Save state immediately after breaking a wall
            this.saveGameProgress();
          } else {
            // Low / Medium power kick -> Shake wall & emit impact dust
            wall.shakeTimer = 0.3;
            this.environment.triggerImpactDust(this.football.x, this.football.y);
          }
        },
        this.environment.sandAreas
      );

      // 3. Player Physics & Input Update
      if (!lockPlayerForElevator) {
        const activePlayerPlatforms = getActivePlatformsForEntity(this.player.x, this.player.y, playerPlatforms);
        this.player.update(
          dt,
          this.input,
          activePlayerPlatforms,
          this.environment.levelWidth,
          this.football,
          this.environment.sandAreas
        );
      }

      // 3.5 Dog Enemies Update, AI State Machine & Damage Interaction
      if (this.environment.dogs.length > 0) {
        this.environment.dogs.forEach(dog => {
          const activeDogPlatforms = getActivePlatformsForEntity(dog.x, dog.y, playerPlatforms);
          dog.update(
            dt,
            this.player,
            this.football,
            activeDogPlatforms,
            this.environment.breakableWalls,
            this.environment.crates,
            (defeatedDog) => {
              this.camera.addShake(7, 0.3);
              this.environment.triggerImpactDust(
                defeatedDog.x + defeatedDog.width / 2,
                defeatedDog.y + defeatedDog.height / 2
              );

              // If Level 3 Ratkeeper Boss is defeated, permanently destroy boss, unlock elevator gate, and open return tunnel
              if (this.environment.currentLevel === 3 || defeatedDog.isBoss) {
                this.environment.isBossDefeated = true;
                SaveManager.setBossDefeated(true);
                SaveManager.setStoneGateOpen(true);

                if (this.environment.bossArena) {
                  this.environment.bossArena.onBossDefeated(this.player);
                  this.environment.bossArena.elevatedPlatforms = [];
                }

                // Unlock elevator gate in previous scene
                if (this.environment.stoneGate) {
                  this.environment.stoneGate.unlock();
                }

                // Remove all floating platforms in the boss room
                this.environment.platforms = this.environment.platforms.filter(
                  p => !p.id.startsWith('boss-perch-') && !p.id.startsWith('boss-altar-')
                );

                // Destroy the boss forever from active enemies
                defeatedDog.isDefeated = true;
                this.environment.dogs = this.environment.dogs.filter(d => !d.isBoss && d !== defeatedDog);

                // Open Exit Hollow Tunnel at the entrance behind the player (X: 40-200)
                if (!this.environment.cavePortals.some(p => p.id === 'tunnel-return-to-jungle')) {
                  this.environment.cavePortals.push({
                    id: 'tunnel-return-to-jungle',
                    x: 40,
                    y: 460,
                    width: 160,
                    height: 160,
                    targetLevel: 2,
                    title: 'CHAPTER 2: JUNGLE CANOPY',
                    subtitle: 'Returning through the hollow tunnel to the catacombs...',
                    spawnCheckpointId: 'jungle-cp-ratkeeper-antechamber',
                    signText: '💀 HOLLOW TUNNEL ➔ RETURN TO CATACOMBS',
                  });
                }
              } else if (this.environment.currentLevel === 2) {
                if (this.environment.dogs.filter(d => !d.isDefeated).length <= 1) {
                  if (this.environment.stoneGate) {
                    this.environment.stoneGate.unlock();
                  }
                }
              }
            }
          );
        });

        // Mutual separation between dogs so they don't overlap into each other
        const dogs = this.environment.dogs;
        for (let i = 0; i < dogs.length; i++) {
          for (let j = i + 1; j < dogs.length; j++) {
            const dogA = dogs[i];
            const dogB = dogs[j];
            if (!dogA.isDefeated && !dogB.isDefeated && dogA.state !== 'SLEEPING' && dogB.state !== 'SLEEPING') {
              const dx = dogB.x - dogA.x;
              const dy = dogB.y - dogA.y;
              if (Math.abs(dx) < 52 && Math.abs(dy) < 30) {
                const overlap = 52 - Math.abs(dx);
                const push = (overlap / 2) * (dx >= 0 ? 1 : -1);
                dogA.x -= push * 0.12;
                dogB.x += push * 0.12;
              }
            }
          }
        }

        // Check if player died from dog attacks
        if (this.player.health <= 0 && this.gameState === 'PLAYING') {
          this.triggerPlayerDeath('dog');
        }
      }

      // 3.55 Level 3 Boss: Ratkeeper Boss State Machine & Attack Updates
      if (this.environment.ratkeeperBoss && this.environment.bossArena) {
        this.environment.ratkeeperBoss.update(
          dt,
          this.player,
          this.football,
          basePlatforms,
          this.environment.bossArena,
          () => {
            this.handleBossDefeat();
          },
          (intensity, duration) => {
            this.camera.addShake(intensity, duration);
          },
          (potion) => {
            this.environment.healthPotions.push(potion);
            this.environment.triggerHealBurst(potion.x + potion.width / 2, potion.y + potion.height / 2);
          }
        );

        if (this.player.health <= 0 && this.gameState === 'PLAYING') {
          this.triggerPlayerDeath('boss');
        }
      }

      // 3.6 Health Refill Potions Pickup Update & Collision Detection
      if (this.environment.healthPotions.length > 0) {
        this.environment.healthPotions.forEach(potion => {
          potion.update(
            dt,
            this.player,
            this.football,
            (collectedPotion) => {
              this.environment.triggerHealBurst(
                collectedPotion.x + collectedPotion.width / 2,
                collectedPotion.y + collectedPotion.height / 2
              );
              this.camera.addShake(3, 0.2);
            }
          );
        });
      }

      // 4. Checkpoint Trigger Check & Auto-Save
      this.environment.checkpoints.forEach(cp => {
        if (!cp.isActive && this.player.x >= cp.x - 20) {
          cp.isActive = true;
          this.activeCheckpoint = cp;
          this.camera.addShake(3, 0.2);
          this.saveGameProgress(true, `Checkpoint Reached: ${cp.name}! Saved.`);
        }
      });

      // Periodic Background Auto-Save (Every 4 seconds when in stable play state)
      this.autoSaveTimer += dt;
      if (this.autoSaveTimer >= 4.0) {
        this.autoSaveTimer = 0;
        if (this.player.isGrounded || this.football.isGrounded) {
          this.saveGameProgress(false);
        }
      }

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

      // 5.1 Check Cave Portals / Tunnel Collision (Level Transition)
      for (const portal of this.environment.cavePortals) {
        if (this.physics.checkAABB(playerHazardBox, portal)) {
          this.startLevelTransition(
            portal.targetLevel,
            portal.title,
            portal.subtitle,
            portal.spawnAtEnd ?? (portal.targetLevel === 1),
            portal.spawnCheckpointId
          );
          break;
        }
      }

      // Also if player moves left past boundary at Level 2 entrance
      if (this.environment.currentLevel === 2 && this.player.x <= 15) {
        this.startLevelTransition(
          1,
          'CHAPTER 1: THE SUBURBIA RUN',
          'Returning to the Suburbia Grounds...',
          true
        );
      }

      // Water Hazards Check (Only trigger ball lost if ball is airborne/submerged, not securely resting on sand/bank)
      const isSubterraneanBall = this.environment.currentLevel === 2 && this.football.x >= 5780 && this.football.y >= 160;
      const isSubterraneanPlayer = this.environment.currentLevel === 2 && this.player.x >= 5780 && this.player.y >= 160;

      if (!isSubterraneanBall || !isSubterraneanPlayer) {
        for (const water of this.environment.waterZones) {
          if (!isSubterraneanBall && !this.football.isGrounded && this.physics.checkAABB(footBox, water)) {
            this.triggerBallLost('water');
            break;
          }
          if (!isSubterraneanPlayer && this.physics.checkAABB(playerHazardBox, water)) {
            this.triggerPlayerDeath('water');
            break;
          }
        }
      }

      // Thorn Hazards Check
      if (this.gameState === 'PLAYING') {
        for (const thorn of this.environment.thornHazards) {
          if (!isSubterraneanBall && this.physics.checkAABB(footBox, thorn)) {
            this.triggerBallLost('thorns');
            break;
          }
          if (!isSubterraneanPlayer && this.physics.checkAABB(playerHazardBox, thorn)) {
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
    } else if (this.gameState === 'LEVEL_TRANSITION') {
      // Level Transition State Machine
      this.environment.update(dt);
      this.transitionTimer += dt;

      if (this.transitionState === 'FADING_OUT') {
        this.fadeAlpha = Math.min(1, this.transitionTimer / 0.7);
        if (this.transitionTimer >= 0.7) {
          this.transitionState = 'BLACK_SCREEN';
          this.transitionTimer = 0;
          this.fadeAlpha = 1.0;

          // Swap level data
          this.environment.loadLevel(this.transitionTargetLevel);

          if (this.transitionSpawnCheckpointId) {
            const targetCp = this.environment.checkpoints.find(c => c.id === this.transitionSpawnCheckpointId);
            if (targetCp) {
              this.activeCheckpoint = targetCp;
            } else {
              this.activeCheckpoint = this.environment.checkpoints[0];
            }
            this.player.reset(
              this.activeCheckpoint.playerSpawnX,
              this.activeCheckpoint.playerSpawnY
            );
            this.player.facingRight = true;
            this.football.reset(
              this.activeCheckpoint.ballSpawnX,
              this.activeCheckpoint.ballSpawnY
            );
          } else if (this.transitionSpawnAtEnd) {
            // Find end tunnel checkpoint (e.g. cp-tunnel-exit) or the last checkpoint in the level
            const endCp =
              this.environment.checkpoints.find(c => c.id === 'cp-tunnel-exit') ||
              this.environment.checkpoints[this.environment.checkpoints.length - 1];
            this.activeCheckpoint = endCp;
            this.environment.checkpoints.forEach(c => (c.isActive = true));
            this.player.reset(
              this.activeCheckpoint.playerSpawnX,
              this.activeCheckpoint.playerSpawnY
            );
            this.player.facingRight = false; // Facing left into Suburbia from the tunnel
            this.football.reset(
              this.activeCheckpoint.ballSpawnX,
              this.activeCheckpoint.ballSpawnY
            );
          } else {
            this.activeCheckpoint = this.environment.checkpoints[0];
            this.player.reset(
              this.activeCheckpoint.playerSpawnX,
              this.activeCheckpoint.playerSpawnY
            );
            this.player.facingRight = true;
            this.football.reset(
              this.activeCheckpoint.ballSpawnX,
              this.activeCheckpoint.ballSpawnY
            );
          }

          this.camera.x = Math.max(0, this.player.x - this.camera.viewWidth * 0.26);
          this.camera.y = Math.max(-150, this.player.y - this.camera.viewHeight * 0.68);
          this.saveGameProgress(true, `Entered ${this.transitionTitle}!`);
        }
      } else if (this.transitionState === 'BLACK_SCREEN') {
        // Hold on black screen with cinematic chapter title card
        if (this.transitionTimer >= 1.2) {
          this.transitionState = 'FADING_IN';
          this.transitionTimer = 0;
          this.chapterBannerTimer = 3.5;
        }
      } else if (this.transitionState === 'FADING_IN') {
        this.fadeAlpha = Math.max(0, 1 - this.transitionTimer / 0.7);
        if (this.transitionTimer >= 0.7) {
          this.fadeAlpha = 0;
          this.transitionState = 'NONE';
          this.gameState = 'PLAYING';
        }
      }
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

    if (this.chapterBannerTimer > 0) {
      this.chapterBannerTimer -= dt;
    }

    // Update Save Toast Timer
    if (this.saveToastTimer > 0) {
      this.saveToastTimer -= dt;
    }

    // Render Scene
    this.render();

    // Trigger Debug Callback
    if (this.onDebugUpdate) {
      this.onDebugUpdate({
        player: this.player.getDebugInfo(this.fps),
        football: this.getFootballDebugInfo(),
        environment: this.getEnvironmentDebugInfo(),
        dogs: this.environment.dogs.map(d => ({
          id: d.id,
          state: d.state,
          health: d.health,
          maxHealth: d.maxHealth,
          x: Math.round(d.x),
          y: Math.round(d.y),
          distanceToPlayer: Math.round(Math.hypot(this.player.x - d.x, this.player.y - d.y)),
        })),
        gameState: this.gameState,
        lastSavedTime: this.lastSavedTime,
        hasSavedGame: this.hasSavedGame,
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
      currentLevel: this.environment.currentLevel || 1,
      chapterTitle: this.environment.chapterTitle,
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

    const startX = this.football.getCenterX() - this.camera.x;
    const startY = this.football.getCenterY() - this.camera.y;

    this.ctx.save();

    // 1. When NOT actively aiming with [R] in Tactical Aim Mode:
    // Only show a short, clean directional axis line from the ball
    if (!isAimingOrPower) {
      const kickDir = this.player.getKickDirection(this.input);
      const powerVec = this.player.getKickVelocityVector(kickDir, 1.0);
      const speed = Math.hypot(powerVec.vx, powerVec.vy);
      const dirX = speed > 0 ? powerVec.vx / speed : (this.player.facingRight ? 1 : -1);
      const dirY = speed > 0 ? powerVec.vy / speed : 0;

      const innerDist = this.football.radius + 2;
      const outerDist = this.football.radius + 18;

      const p1X = startX + dirX * innerDist;
      const p1Y = startY + dirY * innerDist;
      const p2X = startX + dirX * outerDist;
      const p2Y = startY + dirY * outerDist;

      // Short subtle axis line
      this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      this.ctx.lineWidth = 2;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(p1X, p1Y);
      this.ctx.lineTo(p2X, p2Y);
      this.ctx.stroke();

      // Small axis tick point at tip
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.beginPath();
      this.ctx.arc(p2X, p2Y, 1.5, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
      return;
    }

    // 2. TACTICAL PRECISION AIM MODE (When Aiming with [R] or Charging Power)
    const kickDir = this.player.lockedKickDir;
    const powerVec = this.player.getKickVelocityVector(kickDir, this.player.kickPower);
    const launchSpeed = Math.round(Math.hypot(powerVec.vx, powerVec.vy));
    const powerPct = Math.round(this.player.kickPower * 100);

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

    // Health Hearts in Top Right (4 Hearts = 100 HP, 25 HP each)
    const startX = width - 110;
    const startY = 24;

    this.ctx.font = 'bold 12px monospace';
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.fillText('HEALTH:', startX - 65, startY + 4);

    const totalHearts = 4;
    for (let i = 0; i < totalHearts; i++) {
      const hX = startX + i * 22;
      const heartMinHp = (i + 1) * 25;
      const isFull = this.player.health >= heartMinHp;
      const isDamaged = this.player.health > heartMinHp - 25 && this.player.health < heartMinHp;

      this.ctx.fillStyle = isFull ? '#ef4444' : isDamaged ? '#f59e0b' : '#334155';
      this.ctx.beginPath();
      this.ctx.arc(hX, startY, 6, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#f87171';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    // Active Checkpoint HUD Indicator (Top Center)
    if (!this.environment.ratkeeperBoss || !this.environment.bossArena?.encounterStarted || this.environment.isBossDefeated) {
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
    } else {
      // Render Boss Health Bar & Status HUD when fight is active
      this.environment.ratkeeperBoss.renderHUD(this.ctx, width);
    }

    // Auto-Save Toast Floating Pill (Below Checkpoint Banner)
    if (this.saveToastTimer > 0) {
      const toastAlpha = Math.min(1, this.saveToastTimer / 0.4);
      this.ctx.save();
      this.ctx.globalAlpha = toastAlpha;
      this.ctx.fillStyle = 'rgba(6, 78, 59, 0.95)';
      this.ctx.strokeStyle = '#34d399';
      this.ctx.lineWidth = 1.2;

      this.ctx.font = 'bold 10px monospace';
      const toastW = this.ctx.measureText(this.saveToastMessage).width + 24;
      this.ctx.beginPath();
      this.ctx.roundRect(width / 2 - toastW / 2, 44, toastW, 22, 8);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = '#a7f3d0';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`💾 ${this.saveToastMessage}`, width / 2, 55);
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  public saveGameProgress(showToast = false, message = 'Game Saved to Storage'): boolean {
    const brokenWallIds = this.environment.breakableWalls
      .filter(w => w.isBroken)
      .map(w => w.id);

    const crates = this.environment.crates.map(c => ({
      id: c.id,
      x: Math.round(c.x),
      y: Math.round(c.y),
    }));

    const state: SavedGameState = {
      version: 1,
      level: this.environment.currentLevel,
      checkpointId: this.activeCheckpoint.id,
      checkpointName: this.activeCheckpoint.name,
      player: {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        health: this.player.health,
        facingRight: this.player.facingRight,
      },
      football: {
        x: Math.round(this.football.x),
        y: Math.round(this.football.y),
      },
      brokenWallIds,
      crates,
      timestamp: Date.now(),
    };

    const success = SaveManager.saveGameState(state);
    if (success) {
      this.lastSavedTime = state.timestamp;
      this.hasSavedGame = true;
      if (showToast) {
        this.saveToastMessage = message;
        this.saveToastTimer = 2.5;
      }
    }
    return success;
  }

  public resetGameProgress() {
    SaveManager.clearGameState();
    this.hasSavedGame = false;
    this.startNewGame();
    this.saveToastMessage = 'Progress Reset to Beginning!';
    this.saveToastTimer = 2.5;
  }

  public startNewGame() {
    this.environment.loadLevel(1);
    this.activeCheckpoint = this.environment.checkpoints[0];
    this.environment.checkpoints.forEach((cp, idx) => {
      cp.isActive = idx === 0;
    });

    this.player.reset(
      this.activeCheckpoint.playerSpawnX,
      this.activeCheckpoint.playerSpawnY
    );
    this.player.health = this.player.maxHealth;
    this.environment.dogs.forEach(d => d.reset());

    this.football.reset(
      this.activeCheckpoint.ballSpawnX,
      this.activeCheckpoint.ballSpawnY
    );

    this.camera.x = Math.max(0, this.player.x - this.camera.viewWidth * 0.26);
    this.camera.y = Math.max(-150, this.player.y - this.camera.viewHeight * 0.68);
    this.gameState = 'PLAYING';
    this.saveToastMessage = 'Started New Game - Chapter 1!';
    this.saveToastTimer = 2.5;
  }

  public warpToLevel(levelNumber: number, options?: { checkpointId?: string; forceBossReplay?: boolean }) {
    const forceBossReplay = options?.forceBossReplay ?? (levelNumber === 3);
    this.environment.loadLevel(levelNumber, { forceBossReplay });

    if (options?.checkpointId) {
      const cp = this.environment.checkpoints.find(c => c.id === options.checkpointId);
      if (cp) {
        this.activeCheckpoint = cp;
      } else {
        this.activeCheckpoint = this.environment.checkpoints[0];
      }
    } else {
      this.activeCheckpoint = this.environment.checkpoints[0];
    }

    // Activate all checkpoints up to this one
    let reached = false;
    this.environment.checkpoints.forEach(c => {
      if (!reached) {
        c.isActive = true;
        if (c.id === this.activeCheckpoint.id) reached = true;
      }
    });

    this.player.reset(
      this.activeCheckpoint.playerSpawnX,
      this.activeCheckpoint.playerSpawnY
    );
    this.player.health = this.player.maxHealth;
    this.player.facingRight = true;
    this.player.invincibilityTimer = 0;

    this.football.reset(
      this.activeCheckpoint.ballSpawnX,
      this.activeCheckpoint.ballSpawnY
    );

    this.environment.dogs.forEach(d => d.reset());
    if (this.environment.healthPotions) {
      this.environment.healthPotions.forEach(p => p.reset());
    }

    this.camera.x = Math.max(0, this.player.x - this.camera.viewWidth * 0.26);
    this.camera.y = Math.max(-150, this.player.y - this.camera.viewHeight * 0.68);
    this.gameState = 'PLAYING';

    const replayText = forceBossReplay && levelNumber === 3 ? ' (⚔️ Boss Fight Ready)' : '';
    this.saveToastMessage = `Warped: ${this.environment.chapterTitle} - ${this.activeCheckpoint.name}${replayText}`;
    this.saveToastTimer = 3.0;
  }

  public loadSavedGame(): { success: boolean; message: string } {
    const saved = SaveManager.loadGameState();
    if (!saved) {
      this.startNewGame();
      return { success: false, message: 'No saved game found! Started New Game.' };
    }

    this.hasSavedGame = true;
    this.lastSavedTime = saved.timestamp;

    // Load saved level if specified
    if (saved.level && saved.level !== this.environment.currentLevel) {
      this.environment.loadLevel(saved.level);
    } else {
      this.environment.resetLevel();
    }

    // Restore active checkpoint
    const cp = this.environment.checkpoints.find(c => c.id === saved.checkpointId);
    if (cp) {
      this.activeCheckpoint = cp;
      let reached = false;
      this.environment.checkpoints.forEach(c => {
        if (!reached) {
          c.isActive = true;
          if (c.id === cp.id) reached = true;
        }
      });
    } else {
      this.activeCheckpoint = this.environment.checkpoints[0];
    }

    // Restore broken walls
    if (Array.isArray(saved.brokenWallIds)) {
      this.environment.breakableWalls.forEach(wall => {
        if (saved.brokenWallIds.includes(wall.id)) {
          wall.isBroken = true;
        }
      });
    }

    // Restore crates
    if (Array.isArray(saved.crates)) {
      saved.crates.forEach(sc => {
        const crate = this.environment.crates.find(c => c.id === sc.id);
        if (crate) {
          crate.x = sc.x;
          crate.y = sc.y;
        }
      });
    }

    // Restore Player and Football positions
    this.football.reset(saved.football.x, saved.football.y);
    this.player.reset(saved.player.x, saved.player.y);
    this.player.facingRight = saved.player.facingRight;
    this.player.health = Math.max(1, saved.player.health);

    this.camera.x = Math.max(0, this.player.x - this.camera.viewWidth * 0.26);
    this.camera.y = Math.max(-150, this.player.y - this.camera.viewHeight * 0.68);
    this.gameState = 'PLAYING';
    this.saveToastMessage = `Loaded from ${this.activeCheckpoint.name}!`;
    this.saveToastTimer = 2.5;

    return { success: true, message: `Loaded from ${this.activeCheckpoint.name}` };
  }

  public canTeleportToBall(): { allowed: boolean; reason?: string; safeX?: number; safeY?: number } {
    // 1. Teleport Cooldown check
    if (this.player.teleportCooldown > 0) {
      return { allowed: false, reason: `TELEPORT COOLDOWN (${this.player.teleportCooldown.toFixed(1)}s)` };
    }

    // 2. Ball out of bounds check
    if (this.football.y > this.environment.deathBoundaryY) {
      return { allowed: false, reason: 'BALL OUT OF BOUNDS' };
    }

    // 3. Ball in Hazard check
    const footBox = {
      x: this.football.x,
      y: this.football.y,
      width: this.football.radius * 2,
      height: this.football.radius * 2,
    };

    for (const water of this.environment.waterZones) {
      if (!this.football.isGrounded && this.physics.checkAABB(footBox, water)) {
        return { allowed: false, reason: 'BALL IS IN WATER HAZARD' };
      }
    }

    for (const thorn of this.environment.thornHazards) {
      if (this.physics.checkAABB(footBox, thorn)) {
        return { allowed: false, reason: 'BALL IS IN THORN HAZARD' };
      }
    }

    // 4. Ancient Stone Gate Lock Progression Check
    if (this.environment.stoneGate && this.environment.stoneGate.state !== 'GATE_OPEN') {
      const gate = this.environment.stoneGate;
      const playerCenterX = this.player.x + this.player.width / 2;
      const ballCenterX = this.football.x + this.football.radius;
      const gateLeft = gate.x;
      const gateRight = gate.x + gate.width;

      // Check if player and ball are on opposite sides of the locked gate
      const onOppositeSides =
        (playerCenterX < gateLeft && ballCenterX > gateLeft) ||
        (playerCenterX > gateRight && ballCenterX < gateRight);

      // Check if ball or player is inside the gate area
      const ballInGate = ballCenterX >= gateLeft - 10 && ballCenterX <= gateRight + 10;
      const playerInGate = playerCenterX >= gateLeft - 10 && playerCenterX <= gateRight + 10;

      if (onOppositeSides || ballInGate || playerInGate) {
        return { allowed: false, reason: 'ANCIENT GATE IS LOCKED! 🔒' };
      }
    }

    // 4.1 Boss Arena Lock Progression Check (Prevent teleport through locked arena gate)
    if (this.environment.bossArena && this.environment.bossArena.isLocked) {
      const arena = this.environment.bossArena;
      const playerCenterX = this.player.x + this.player.width / 2;
      const ballCenterX = this.football.x + this.football.radius;
      const gateX = arena.gateX;

      const onOppositeSides =
        (playerCenterX < gateX && ballCenterX > gateX) ||
        (playerCenterX > gateX && ballCenterX < gateX);

      if (onOppositeSides) {
        return { allowed: false, reason: 'ARENA IS LOCKED! 🔒' };
      }
    }

    // 5. Narrow Space Check:
    // Direct destination is exactly where the ball is
    const targetX = this.football.x + this.football.radius - this.player.width / 2;
    const targetY = this.football.y + this.football.radius * 2 - this.player.height;

    const wallPlatforms = this.environment.breakableWalls
      .filter(w => !w.isBroken)
      .map(w => ({ id: w.id, x: w.x, y: w.y, width: w.width, height: w.height }));
    const cratePlatforms = this.environment.crates.map(c => c.toPlatform());
    const allPlats = [...this.environment.platforms, ...wallPlatforms, ...cratePlatforms];

    // Check if the player's full body height cannot fit at the ball location (e.g. narrow chute, tight tunnel ceiling)
    const isNarrowSpace = allPlats.some(plat => {
      const overlapX = (targetX + this.player.width > plat.x + 2) && (targetX < plat.x + plat.width - 2);
      const overlapY = (targetY < plat.y + plat.height - 4) && (targetY + this.player.height > plat.y + 12);
      return overlapX && overlapY;
    });

    if (isNarrowSpace) {
      return { allowed: false, reason: 'NARROW SPACE (CANNOT FIT)' };
    }

    return { allowed: true, safeX: targetX, safeY: targetY };
  }

  public attemptTeleport() {
    const check = this.canTeleportToBall();
    if (check.allowed) {
      // Particle burst at origin player location
      this.environment.spawnTeleportBurst(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2
      );

      // Perform teleport to calculated coordinates (works anytime: mid-air, rolling, resting)
      const destX = check.safeX !== undefined ? check.safeX : (this.football.x + this.football.radius - this.player.width / 2);
      const destY = check.safeY !== undefined ? check.safeY : (this.football.y + this.football.radius * 2 - this.player.height);
      const inAir = !this.football.isGrounded;
      const initialVx = inAir ? this.football.vx * 0.4 : 0;
      const initialVy = inAir ? Math.min(this.football.vy * 0.4, 80) : 0;

      this.player.teleportTo(destX, destY, inAir, initialVx, initialVy);

      // Particle burst at destination player location
      this.environment.spawnTeleportBurst(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2
      );

      // Quick cooldown
      this.player.teleportCooldown = 0.25;

      // Visual camera shake and floating badge
      this.camera.addShake(4, 0.2);
      this.player.showFloatingStatus('TELEPORT! ⚡', '#f0abfc', '#a855f7');
    } else if (check.reason) {
      // Show error status badge above player
      this.player.showFloatingStatus(check.reason, '#fca5a5', '#dc2626');
    }
  }

  public recallBall() {
    if (this.gameState !== 'PLAYING') return;

    // Spawn dust at original ball location
    this.environment.triggerImpactDust(this.football.x, this.football.y);

    // Reposition ball at player's feet
    const targetX = this.player.facingRight
      ? this.player.x + this.player.width + 4
      : this.player.x - this.football.radius * 2 - 4;
    const targetY = this.player.y + this.player.height - this.football.radius * 2;
    this.football.reset(targetX, targetY);

    // Particle burst and feedback
    this.environment.spawnTeleportBurst(targetX + this.football.radius, targetY + this.football.radius);
    this.player.showFloatingStatus('BALL RECALLED! ⚽', '#86efac', '#16a34a');
  }

  public handleCanvasClick(worldX: number, worldY: number) {
    // 1. If currently dead or ball lost, clicking speeds up / instantly triggers respawn
    if (this.gameState !== 'PLAYING') {
      this.respawnTimer = 0;
      this.respawnAtCheckpoint();
      return;
    }

    // 2. If in PLAYING state and player can kick the ball
    if (this.player.canKickBall(this.football) && this.player.kickCooldown <= 0 && this.player.state !== 'KICK') {
      const ballCenterX = this.football.getCenterX();
      const ballCenterY = this.football.getCenterY();

      const dx = worldX - ballCenterX;
      const dy = worldY - ballCenterY;

      // Face in the direction of the click
      const prevFacing = this.player.facingRight;
      if (dx >= 0) {
        this.player.facingRight = true;
      } else {
        this.player.facingRight = false;
      }
      if (this.player.facingRight !== prevFacing && this.player.isTouchingFootball(this.football)) {
        this.player.rotateBallToFacingDirection(this.football, this.environment.platforms);
      }

      // Determine kick direction from click angle
      let kickDir: KickDirection = 'FORWARD';
      if (dy < -60 && Math.abs(dx) < 60) {
        kickDir = 'UP';
      } else if (dy < -20) {
        kickDir = 'FORWARD_UP';
      } else if (dy > 40) {
        kickDir = 'FORWARD_DOWN';
      } else {
        kickDir = 'FORWARD';
      }

      this.player.executeKick(kickDir, 0.85);
    }
  }

  private renderOverlayBanners() {
    if (this.gameState === 'PLAYING' && this.fadeAlpha === 0 && this.chapterBannerTimer <= 0) return;

    const { width, height } = this.canvas;
    this.ctx.save();

    // 1. Fade to Solid Black Overlay
    if (this.fadeAlpha > 0) {
      this.ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
      this.ctx.fillRect(0, 0, width, height);
    }

    // 2. Cinematic Chapter Announcement Card (During black screen or first few seconds of new level)
    if (this.transitionState === 'BLACK_SCREEN' || this.chapterBannerTimer > 0) {
      const bannerAlpha = this.transitionState === 'BLACK_SCREEN'
        ? 1.0
        : Math.min(1, this.chapterBannerTimer / 0.8);

      this.ctx.save();
      this.ctx.globalAlpha = bannerAlpha;

      const isJungle = this.environment.currentLevel === 2;
      const cardW = Math.min(540, width - 40);
      const cardH = 140;
      const cardX = width / 2 - cardW / 2;
      const cardY = height / 2 - cardH / 2;

      // Glow backing
      this.ctx.shadowColor = isJungle ? 'rgba(74, 222, 128, 0.6)' : 'rgba(56, 189, 248, 0.6)';
      this.ctx.shadowBlur = 24;

      // Card Background
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
      this.ctx.strokeStyle = isJungle ? '#4ade80' : '#38bdf8';
      this.ctx.lineWidth = 2.5;

      this.ctx.beginPath();
      this.ctx.roundRect(cardX, cardY, cardW, cardH, 16);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.shadowBlur = 0;

      // Chapter Badge Top
      this.ctx.font = 'bold 12px monospace';
      this.ctx.fillStyle = isJungle ? '#86efac' : '#7dd3fc';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(
        isJungle ? '🌴 CHAPTER 2 UNLOCKED 🌴' : '⚽ CHAPTER 1 ⚽',
        width / 2,
        cardY + 20
      );

      // Chapter Title
      this.ctx.font = '900 24px system-ui, sans-serif';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(
        isJungle ? 'THE JUNGLE RUSH' : 'THE SUBURBIA RUN',
        width / 2,
        cardY + 44
      );

      // Chapter Subtitle
      this.ctx.font = '500 13px system-ui, sans-serif';
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.fillText(
        isJungle ? 'Navigating the wild ancient jungle canopy & tree roots...' : 'Mastering kicks, passes, and ball control...',
        width / 2,
        cardY + 82
      );

      // Status Pill
      this.ctx.font = 'bold 11px monospace';
      this.ctx.fillStyle = isJungle ? '#fde047' : '#93c5fd';
      this.ctx.fillText(
        isJungle ? '✦ NEW BIOME LOADED • CANOPY CANOPY RUINS ✦' : '✦ SUBURBAN STREETS & STADIUM ✦',
        width / 2,
        cardY + 110
      );

      this.ctx.restore();
    }

    // 3. Game Over / Ball Lost Banner Modal
    if (this.gameState === 'BALL_LOST' || this.gameState === 'PLAYER_DIED') {
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

    // 1. Render Background with Parallax Layers
    this.environment.renderBackground(this.ctx, this.camera.x, width, height);

    // 2. Render Foreground (Platforms, Trees, Water, Thorns, Checkpoints)
    this.environment.renderForeground(this.ctx, this.camera.x, this.camera.y, width, this.showDebugBoxes);

    // 2.5 Render Dog Enemies
    this.environment.dogs.forEach(dog => {
      dog.render(this.ctx, this.camera.x, this.camera.y, this.showDebugBoxes);
    });

    // 2.6 Render Ratkeeper Boss & Projectiles
    if (this.environment.ratkeeperBoss) {
      this.environment.ratkeeperBoss.render(this.ctx, this.camera.x, this.camera.y, this.showDebugBoxes);
    }

    // 3. Render Football
    this.football.render(this.ctx, this.camera.x, this.camera.y, this.showDebugBoxes);

    // 4. Render Aiming Indicator when in kick range
    this.renderAimingIndicator();

    // 5. Render Player
    this.player.render(this.ctx, this.camera.x, this.camera.y, this.showDebugBoxes);

    // 6. Render HUD (Health & Checkpoint)
    this.renderHUD();

    // 6.5 Render Boss Arena Scene Intro Banner ("The Ratkeeper")
    if (this.environment.bossArena) {
      this.environment.bossArena.renderSceneBanner(this.ctx, width, height);
    }

    // 7. Render Overlay Banners (Ball Lost / Try Again / Fade)
    this.renderOverlayBanners();
  }
}
