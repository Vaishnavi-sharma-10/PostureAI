import { NormalizedLandmark, PostureMetrics } from '../types';

// Connective pairs corresponding to MediaPipe Pose 33 indices
export const POSE_CONNECTIONS: [number, number][] = [
  // Face & Neck
  [0, 1], [1, 2], [2, 3], [3, 7], // Left eye to ear
  [0, 4], [4, 5], [5, 6], [6, 8], // Right eye to ear
  [9, 10], // Mouth

  // Shoulders & Torso
  [11, 12], // Left shoulder to Right shoulder
  [11, 23], // Left shoulder to Left hip
  [12, 24], // Right shoulder to Right hip
  [23, 24], // Left hip to Right hip

  // Left Arm
  [11, 13], [13, 15],
  // Right Arm
  [12, 14], [14, 16],

  // Legs (if visible)
  [23, 25], [25, 27],
  [24, 26], [26, 28]
];

export interface DrawOptions {
  showPlumbline?: boolean;
  showAngles?: boolean;
  showLandmarkNames?: boolean;
  mirror?: boolean;
}

export function drawPoseHUD(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  metrics: PostureMetrics,
  width: number,
  height: number,
  options: DrawOptions = {}
) {
  const { showPlumbline = true, showAngles = true, mirror = false } = options;

  ctx.save();

  // Mathematically compensate for mirrored selfie video:
  // mirroredX = 1 - originalX, then converted to canvas pixel coordinate (x = mirroredX * width).
  // This aligns the skeleton with the mirrored person while keeping the canvas and all drawn text unmirrored.
  const renderLandmarks: NormalizedLandmark[] = mirror
    ? landmarks.map(lm => ({
        ...lm,
        x: 1 - lm.x
      }))
    : landmarks;

  // Status-based accent color
  let accentColor = '#00e5ff'; // Optimal: Cyan
  let glowColor = 'rgba(0, 229, 255, 0.6)';
  if (metrics.rating === 'acceptable') {
    accentColor = '#ffb95f'; // Amber
    glowColor = 'rgba(255, 185, 95, 0.6)';
  } else if (metrics.rating === 'deviated') {
    accentColor = '#ff6b6b'; // Coral
    glowColor = 'rgba(255, 107, 107, 0.7)';
  }

  // Draw Corner HUD brackets
  drawCornerBrackets(ctx, width, height, accentColor);

  // Draw Plumbline & Horizon guides if enabled
  if (showPlumbline && renderLandmarks[11] && renderLandmarks[12]) {
    const leftS = renderLandmarks[11];
    const rightS = renderLandmarks[12];
    const midX = ((leftS.x + rightS.x) / 2) * width;
    const midY = ((leftS.y + rightS.y) / 2) * height;

    // Vertical plumbline
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(midX, 20);
    ctx.lineTo(midX, height - 20);
    ctx.stroke();
    ctx.restore();

    // Shoulder horizon reference
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(20, midY);
    ctx.lineTo(width - 20, midY);
    ctx.stroke();
    ctx.restore();
  }

  // Draw Connection Bones with glowing stroke
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 12;
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = accentColor;

  for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
    const p1 = renderLandmarks[startIdx];
    const p2 = renderLandmarks[endIdx];

    if (!p1 || !p2) continue;
    // Skip if visibility is too low
    if ((p1.visibility ?? 1) < 0.35 || (p2.visibility ?? 1) < 0.35) continue;

    ctx.beginPath();
    ctx.moveTo(p1.x * width, p1.y * height);
    ctx.lineTo(p2.x * width, p2.y * height);
    ctx.stroke();
  }
  ctx.restore();

  // Draw Landmarks (Joint Rings)
  for (let i = 0; i < renderLandmarks.length; i++) {
    const p = renderLandmarks[i];
    if (!p || (p.visibility ?? 1) < 0.35) continue;

    // Only draw upper body and torso landmarks in detail
    if (i > 24) continue;

    const px = p.x * width;
    const py = p.y * height;

    // Outer subtle ring
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(14, 19, 33, 0.8)';
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Inner bright core
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  // Draw Angle Badges & HUD Overlays directly on canvas (unmirrored and completely readable)
  if (showAngles) {
    const leftS = renderLandmarks[11];
    const rightS = renderLandmarks[12];
    const leftEar = renderLandmarks[7];
    const rightEar = renderLandmarks[8];

    // Shoulder tilt badge
    if (leftS && rightS && (leftS.visibility ?? 1) > 0.4 && (rightS.visibility ?? 1) > 0.4) {
      const midSX = ((leftS.x + rightS.x) / 2) * width;
      const midSY = ((leftS.y + rightS.y) / 2) * height;

      drawBadge(
        ctx,
        midSX,
        midSY - 20,
        `TILT: ${metrics.shoulderTiltAngle}°`,
        metrics.shoulderTiltAngle > 4.5 ? '#ffb95f' : '#4edea3'
      );
    }

    // Head position angle badge
    const ear = (leftEar?.visibility ?? 0) > (rightEar?.visibility ?? 0) ? leftEar : rightEar;
    if (ear && (ear.visibility ?? 1) > 0.4) {
      const badgeX = ear.x < 0.5 ? ear.x * width + 60 : ear.x * width - 60;
      drawBadge(
        ctx,
        badgeX,
        ear.y * height,
        `HEAD POSITION: ${metrics.forwardHeadAngle}°`,
        metrics.forwardHeadAngle > 12 ? '#ff6b6b' : '#00e5ff'
      );
    }

    // Posture score badge on canvas top center
    drawBadge(
      ctx,
      width / 2,
      24,
      `POSTURE SCORE: ${metrics.overallScore} / 100`,
      accentColor
    );

    // Torso lean badge if hips are visible
    const leftHip = renderLandmarks[23];
    const rightHip = renderLandmarks[24];
    if (leftHip && rightHip && (leftHip.visibility ?? 1) > 0.35 && (rightHip.visibility ?? 1) > 0.35) {
      const midHX = ((leftHip.x + rightHip.x) / 2) * width;
      const midHY = ((leftHip.y + rightHip.y) / 2) * height;
      if (metrics.torsoSlouchAngle > 4 || metrics.viewDetected === 'side') {
        drawBadge(
          ctx,
          midHX,
          midHY - 16,
          `TORSO: ${metrics.torsoSlouchAngle}°`,
          metrics.torsoSlouchAngle > 8 ? '#ff6b6b' : '#00e5ff'
        );
      }
    }
  }

  ctx.restore();
}

function drawCornerBrackets(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  const len = 24;
  const pad = 16;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(pad, pad + len);
  ctx.lineTo(pad, pad);
  ctx.lineTo(pad + len, pad);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(w - pad - len, pad);
  ctx.lineTo(w - pad, pad);
  ctx.lineTo(w - pad, pad + len);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(pad, h - pad - len);
  ctx.lineTo(pad, h - pad);
  ctx.lineTo(pad + len, h - pad);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(w - pad - len, h - pad);
  ctx.lineTo(w - pad, h - pad);
  ctx.lineTo(w - pad, h - pad - len);
  ctx.stroke();

  ctx.restore();
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
  fontSize: number = 11
) {
  ctx.save();
  ctx.font = `600 ${fontSize}px "Space Grotesk", ui-monospace, monospace, sans-serif`;
  ctx.textBaseline = 'middle';
  const textMetrics = ctx.measureText(text);
  const pw = textMetrics.width + 16;
  const ph = fontSize + 10;

  const bx = Math.max(12, Math.min(ctx.canvas.width - pw - 12, x - pw / 2));
  const by = Math.max(12, Math.min(ctx.canvas.height - ph - 12, y - ph / 2));

  // Background pill
  ctx.fillStyle = 'rgba(14, 19, 33, 0.90)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(bx, by, pw, ph, 5);
  ctx.fill();
  ctx.stroke();

  // Text (drawn unmirrored, completely readable)
  ctx.fillStyle = color;
  ctx.fillText(text, bx + 8, by + ph / 2);
  ctx.restore();
}
