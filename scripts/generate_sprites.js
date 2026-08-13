import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

// Ensure public directory exists
const publicDir = path.resolve('./public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const FRAME_W = 64;
const FRAME_H = 64;

// Helper to create a blank PNG buffer
function createFrameSheet(frameCount) {
  const png = new PNG({
    width: FRAME_W * frameCount,
    height: FRAME_H,
    filterType: -1,
  });
  // Clear transparent
  png.data.fill(0);
  return png;
}

// Drawing helpers
function setPixel(png, x, y, r, g, b, a = 255) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
}

function fillRect(png, startX, startY, w, h, r, g, b, a = 255) {
  for (let py = startY; py < startY + h; py++) {
    for (let px = startX; px < startX + w; px++) {
      setPixel(png, px, py, r, g, b, a);
    }
  }
}

function fillCircle(png, cx, cy, radius, r, g, b, a = 255) {
  for (let py = cy - radius; py <= cy + radius; py++) {
    for (let px = cx - radius; px <= cx + radius; px++) {
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        setPixel(png, px, py, r, g, b, a);
      }
    }
  }
}

// Colors
const SKIN = [255, 205, 160];
const HAIR = [90, 50, 20];
const CAP_BLUE = [30, 110, 220];
const CAP_VISOR = [15, 60, 140];
const SHIRT_RED = [225, 50, 50];
const BACKPACK_BROWN = [140, 80, 40];
const SHORTS_NAVY = [30, 45, 90];
const SHOE_WHITE = [240, 240, 245];
const SHOE_SOLE = [40, 40, 50];
const EYE_BLACK = [20, 20, 30];

// Draw school boy in a frame at offset F
function drawBoy(png, f, options) {
  const offsetX = f * FRAME_W;
  const {
    bodyYOffset = 0,
    legPhase = 0, // -1 to 1 for leg swing
    armPhase = 0, // -1 to 1 for arm swing
    isJumping = false,
    jumpPose = 0, // 0: crouch, 1: upward, 2: apex, 3: fall, 4: land
    isBlinking = false,
  } = options;

  const centerX = offsetX + 32;
  const baseY = 56 + bodyYOffset;

  // Jump poses modifications
  let kneeY = baseY - 12;
  let hipY = baseY - 24;
  let torsoY = hipY - 14;
  let headCY = torsoY - 12;

  let leftFootX = centerX - 6;
  let rightFootX = centerX + 6;
  let leftFootY = baseY - 2;
  let rightFootY = baseY - 2;

  let leftHandX = centerX - 12;
  let rightHandX = centerX + 12;
  let leftHandY = torsoY + 6;
  let rightHandY = torsoY + 6;

  if (isJumping) {
    if (jumpPose === 0) { // Crouch
      hipY += 4;
      torsoY += 4;
      headCY += 4;
      leftFootX = centerX - 8;
      rightFootX = centerX + 8;
      leftHandY += 4;
      rightHandY += 4;
    } else if (jumpPose === 1) { // Upward launch
      hipY -= 4;
      torsoY -= 6;
      headCY -= 6;
      leftFootY = baseY + 4;
      rightFootY = baseY + 4;
      rightHandY = headCY - 4; // arm up
      leftHandY = headCY - 2;
    } else if (jumpPose === 2) { // Apex tuck
      hipY -= 8;
      torsoY -= 10;
      headCY -= 10;
      leftFootY = hipY + 8;
      rightFootY = hipY + 8;
      leftFootX = centerX - 5;
      rightFootX = centerX + 5;
      leftHandX = centerX - 14;
      rightHandX = centerX + 14;
      leftHandY = torsoY;
      rightHandY = torsoY;
    } else if (jumpPose === 3) { // Falling
      hipY -= 2;
      torsoY -= 4;
      headCY -= 4;
      leftFootY = baseY;
      rightFootY = baseY + 2;
      leftHandY = torsoY - 6; // arms out/up for balance
      rightHandY = torsoY - 6;
    } else if (jumpPose === 4) { // Landing impact
      hipY += 2;
      torsoY += 2;
      headCY += 2;
      leftFootX = centerX - 9;
      rightFootX = centerX + 9;
    }
  } else {
    // Running / Idle leg & arm swings
    const legDist = legPhase * 12;
    leftFootX = centerX - legDist;
    rightFootX = centerX + legDist;

    const armDist = armPhase * 10;
    leftHandX = centerX + armDist;
    rightHandX = centerX - armDist;
  }

  // 1. Backpack behind
  fillCircle(png, centerX - 8, torsoY + 2, 7, ...BACKPACK_BROWN);
  fillRect(png, centerX - 12, torsoY - 2, 4, 8, 100, 55, 25);

  // 2. Legs & Shoes
  // Left Leg
  fillRect(png, leftFootX - 2, hipY, 5, Math.max(2, leftFootY - hipY), ...SKIN);
  // Left Shoe
  fillRect(png, leftFootX - 4, leftFootY - 3, 9, 5, ...SHOE_WHITE);
  fillRect(png, leftFootX - 4, leftFootY + 1, 9, 2, ...SHOE_SOLE);

  // Right Leg
  fillRect(png, rightFootX - 2, hipY, 5, Math.max(2, rightFootY - hipY), ...SKIN);
  // Right Shoe
  fillRect(png, rightFootX - 4, rightFootY - 3, 9, 5, ...SHOE_WHITE);
  fillRect(png, rightFootX - 4, rightFootY + 1, 9, 2, ...SHOE_SOLE);

  // Shorts
  fillRect(png, centerX - 8, hipY - 4, 17, 8, ...SHORTS_NAVY);

  // 3. Torso (Red Shirt)
  fillRect(png, centerX - 8, torsoY - 4, 17, 12, ...SHIRT_RED);
  // Yellow stripe or collar
  fillRect(png, centerX - 4, torsoY - 4, 9, 3, 240, 200, 40);

  // 4. Arms
  // Left arm
  fillRect(png, leftHandX - 2, torsoY - 2, 4, Math.abs(leftHandY - torsoY) + 4, ...SKIN);
  fillCircle(png, leftHandX, leftHandY, 3, ...SKIN);

  // Right arm
  fillRect(png, rightHandX - 2, torsoY - 2, 4, Math.abs(rightHandY - torsoY) + 4, ...SKIN);
  fillCircle(png, rightHandX, rightHandY, 3, ...SKIN);

  // 5. Head & Face
  fillCircle(png, centerX, headCY, 9, ...SKIN);

  // Hair under cap
  fillCircle(png, centerX - 3, headCY - 3, 8, ...HAIR);

  // Cap
  fillCircle(png, centerX, headCY - 4, 9, ...CAP_BLUE);
  // Cap Visor facing right
  fillRect(png, centerX + 1, headCY - 4, 11, 4, ...CAP_VISOR);

  // Eyes (facing right)
  if (isBlinking) {
    fillRect(png, centerX + 3, headCY - 1, 4, 1, ...EYE_BLACK);
  } else {
    fillCircle(png, centerX + 4, headCY - 1, 2, ...EYE_BLACK);
    // Eye highlight
    setPixel(png, centerX + 5, headCY - 2, 255, 255, 255);
  }

  // Smile
  setPixel(png, centerX + 5, headCY + 3, 180, 60, 60);
  setPixel(png, centerX + 6, headCY + 2, 180, 60, 60);
}

// 1. Generate idle.png (4 frames)
const idlePng = createFrameSheet(4);
for (let f = 0; f < 4; f++) {
  const bodyY = (f === 1 || f === 3) ? -1 : 0;
  const isBlinking = (f === 2);
  drawBoy(idlePng, f, {
    bodyYOffset: bodyY,
    legPhase: 0.1,
    armPhase: 0.1 * (f % 2 === 0 ? 1 : -1),
    isBlinking,
  });
}
fs.writeFileSync(path.join(publicDir, 'idle.png'), PNG.sync.write(idlePng));
console.log('Created public/idle.png (4 frames)');

// 2. Generate run.png (6 frames)
const runPng = createFrameSheet(6);
const legPhases = [0.8, 0.4, -0.4, -0.8, -0.3, 0.3];
const armPhases = [-0.8, -0.4, 0.4, 0.8, 0.3, -0.3];
const bodyYOffsets = [-2, 0, -2, -2, 0, -2];
for (let f = 0; f < 6; f++) {
  drawBoy(runPng, f, {
    bodyYOffset: bodyYOffsets[f],
    legPhase: legPhases[f],
    armPhase: armPhases[f],
  });
}
fs.writeFileSync(path.join(publicDir, 'run.png'), PNG.sync.write(runPng));
console.log('Created public/run.png (6 frames)');

// 3. Generate jump.png (5 frames)
const jumpPng = createFrameSheet(5);
for (let f = 0; f < 5; f++) {
  drawBoy(jumpPng, f, {
    isJumping: true,
    jumpPose: f,
  });
}
fs.writeFileSync(path.join(publicDir, 'jump.png'), PNG.sync.write(jumpPng));
console.log('Created public/jump.png (5 frames)');
