import express from "express";
import http from "http";
import path from "path";
import dotenv from "dotenv";

import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();



const app = express();
const PORT = 3000;

app.use(express.json());

// API health endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "POSTUREAI",
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

// Gemini AI Posture Coaching & Summary API
app.post("/api/posture-summary", async (req, res) => {
  const {
    postureScore,
    activity = "standing",
    shoulderAlignment = "good",
    hipAlignment = "good",
    headPosition = "good",
    torsoAlignment = "good",
    overallScore = postureScore ?? 80,
    headAngle = 10,
    shoulderTilt = 2,
    hipTilt = 2,
    torsoSlouch = 5,
    sessionDurationSeconds = 30,
    timeInGoodPosturePercent = 85,
    flaggedIssues = [],
    cameraView = "front"
  } = req.body;

  const fallbackSummary = `Your overall alignment during ${activity} recorded a posture score of ${overallScore}/100 with ${timeInGoodPosturePercent}% time in healthy alignment. ${
    overallScore >= 85
      ? "Your spinal symmetry and axial plumbline are well balanced."
      : overallScore >= 70
      ? "Try to keep your head naturally aligned with your shoulders to minimize cervical compression."
      : "Noticeable forward head migration and torso slouch were identified during tracking."
  }`;

  const fallbackRecommendations = [
    headAngle > 12
      ? "Elevate your display monitor so your eye horizon aligns with the top third of your screen."
      : "Maintain eye-level monitor height to avoid excessive neck flexion.",
    shoulderTilt > 4
      ? "Verify armrest height and mouse positioning to prevent unilateral shoulder elevation."
      : "Keep shoulder blades gently drawn backward and downward.",
    "Adopt the 20-20-20 rule: every 20 minutes, take a 20-second break to roll shoulders and reset spine."
  ];

  const primaryIssue = flaggedIssues[0] || (overallScore > 80 ? "Sustained Stability" : "Cervical & Thoracic Stacking");

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.json({
      success: true,
      source: "deterministic_fallback",
      summary: fallbackSummary,
      recommendations: fallbackRecommendations,
      focusArea: primaryIssue,
      encouragement: "Consistent micro-adjustments develop lasting postural endurance.",
      aiExplanationUnavailable: false,
      disclaimer: "PostureAI provides biomechanical awareness and ergonomic habit cues. It is not a medical diagnostic device."
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });

    const prompt = `You are the AI Posture & Ergonomics Coach for POSTUREAI.
The local computer vision biomechanical engine has already computed the following objective structured measurements:
{
  "postureScore": ${overallScore},
  "activity": "${activity}",
  "shoulderAlignment": "${shoulderAlignment}",
  "hipAlignment": "${hipAlignment}",
  "headPosition": "${headPosition}",
  "torsoAlignment": "${torsoAlignment}",
  "headAngle": ${Number(headAngle).toFixed(1)}°,
  "shoulderTilt": ${Number(shoulderTilt).toFixed(1)}°,
  "torsoSlouch": ${Number(torsoSlouch).toFixed(1)}°,
  "sessionDurationSeconds": ${Math.round(sessionDurationSeconds)},
  "timeInGoodPosturePercent": ${timeInGoodPosturePercent}%,
  "cameraView": "${cameraView}",
  "flaggedDeviations": ${JSON.stringify(flaggedIssues)}
}

CRITICAL RULES:
1. Do NOT make any medical diagnosis or treat diseases. Focus strictly on ergonomic workstation tips, alignment habits, and gentle mobility cues.
2. Convert these structured metrics into a warm, natural-language explanation.
3. Return valid JSON matching this schema:
{
  "summary": "2-3 sentences summarizing postural consistency and alignment dynamics",
  "focusArea": "Primary area to attend to (e.g., Cervical Alignment, Shoulder Symmetry, Lumbar Support)",
  "recommendations": ["Actionable tip 1", "Actionable tip 2", "Actionable tip 3"],
  "encouragement": "A brief, motivating coaching takeaway"
}`;

    // Exponential backoff retry logic for Gemini with small max retry count
    let responseText = "";
    let attempt = 0;
    const maxRetries = 2;
    let delayMs = 500;

    while (attempt <= maxRetries) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });
        responseText = response.text || "";
        break;
      } catch (err: any) {
        attempt++;
        const isUnavailable = err?.status === 503 || String(err?.message || "").includes("503") || String(err?.message || "").includes("UNAVAILABLE");
        const isRateLimit = err?.status === 429 || String(err?.message || "").includes("429");

        if (attempt <= maxRetries && (isUnavailable || isRateLimit)) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs *= 2;
        } else {
          throw err;
        }
      }
    }

    const parsed = JSON.parse(responseText || "{}");
    return res.json({
      success: true,
      source: "gemini",
      summary: parsed.summary || fallbackSummary,
      focusArea: parsed.focusArea || primaryIssue,
      recommendations: Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
        ? parsed.recommendations
        : fallbackRecommendations,
      encouragement: parsed.encouragement || "Consistent micro-adjustments develop lasting postural endurance.",
      aiExplanationUnavailable: false,
      disclaimer: "PostureAI provides biomechanical awareness and ergonomic habit cues. It is not a medical diagnostic device."
    });
  } catch (error: any) {
    // Graceful fallback on 503 UNAVAILABLE or network glitch
    console.info(`[Gemini Posture API] Upstream AI explanation temporarily unavailable (${error?.status || '503'}). Utilizing deterministic ergonomic engine.`);
    return res.json({
      success: true,
      source: "deterministic_fallback",
      summary: fallbackSummary,
      focusArea: primaryIssue,
      recommendations: fallbackRecommendations,
      encouragement: "Consistent micro-adjustments develop lasting postural endurance.",
      aiExplanationUnavailable: true,
      disclaimer: "PostureAI provides biomechanical awareness and ergonomic habit cues. It is not a medical diagnostic device."
    });
  }
});

// Start Vite middleware or static serving
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer }
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[POSTUREAI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
