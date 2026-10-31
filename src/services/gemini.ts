export interface StructuredPosturePayload {
  postureScore: number;
  activity: string;
  shoulderAlignment: 'optimal' | 'good' | 'needs_improvement' | 'deviated';
  hipAlignment: 'optimal' | 'good' | 'needs_improvement' | 'deviated';
  headPosition: 'optimal' | 'good' | 'needs_improvement' | 'deviated';
  torsoAlignment: 'optimal' | 'good' | 'needs_improvement' | 'deviated';
  headAngle: number;
  shoulderTilt: number;
  hipTilt?: number;
  torsoSlouch: number;
  sessionDurationSeconds: number;
  timeInGoodPosturePercent: number;
  flaggedIssues: string[];
  cameraView: string;
}

export interface AISummaryResponse {
  success: boolean;
  source: 'gemini' | 'deterministic_fallback' | 'fallback_on_error';
  summary: string;
  focusArea: string;
  recommendations: string[];
  encouragement?: string;
  aiExplanationUnavailable?: boolean;
  disclaimer: string;
}

/**
 * Deterministic local summary generator.
 * Produces structured natural-language coaching directly from objective measurements.
 * Used as primary fallback whenever Gemini is unavailable (e.g. 503, rate limit, or offline).
 */
export function generateLocalDeterministicSummary(params: StructuredPosturePayload): AISummaryResponse {
  const {
    postureScore,
    activity,
    headAngle,
    shoulderTilt,
    hipTilt = 2,
    torsoSlouch,
    timeInGoodPosturePercent,
    flaggedIssues
  } = params;

  const isGood = postureScore >= 80;
  const isFair = postureScore >= 65;

  let summary = '';
  if (isGood) {
    summary = `Your overall alignment looks good with a posture score of ${postureScore}/100. During your ${activity} session, you maintained healthy alignment for ${timeInGoodPosturePercent}% of the duration.`;
    if (headAngle > 10) {
      summary += ' Try to keep your head naturally aligned with your shoulders to reduce cervical load.';
    } else {
      summary += ' Excellent axial spine stacking and lateral symmetry were maintained.';
    }
  } else if (isFair) {
    summary = `Your assessment completed with a moderate score of ${postureScore}/100. Good alignment was maintained for ${timeInGoodPosturePercent}% of the session, with intermittent forward head displacement and minor shoulder asymmetry.`;
  } else {
    summary = `Your postural assessment recorded a score of ${postureScore}/100. Noticeable postural deviation was identified during ${activity}. Focus on stabilizing your lumbar curve and aligning your ears over your acromion.`;
  }

  const recommendations: string[] = [];

  if (headAngle > 12) {
    recommendations.push(
      'Elevate your monitor so your horizon aligns with the top third of the display to prevent forward head posture.'
    );
  } else {
    recommendations.push(
      'Maintain eye-level monitor height to avoid excessive cervical spine flexion.'
    );
  }

  if (shoulderTilt > 4) {
    recommendations.push(
      'Verify armrest height and mouse positioning to prevent unilateral shoulder elevation.'
    );
  } else {
    recommendations.push(
      'Keep shoulder blades gently drawn backward and downward throughout work periods.'
    );
  }

  if (torsoSlouch > 7) {
    recommendations.push(
      activity === 'sitting'
        ? 'Engage lumbar support and sit fully against your chair backrest to avoid thoracic kyphosis.'
        : 'Stack rib cage directly over pelvic crest to maintain vertical plumbline.'
    );
  } else {
    recommendations.push(
      'Practice the 20-20-20 rule: every 20 minutes, take a 20-second break to perform chin tucks and reset posture.'
    );
  }

  const focusArea = flaggedIssues[0] || (isGood ? 'Endurance & Stability' : 'Cervical & Thoracic Stacking');

  return {
    success: true,
    source: 'deterministic_fallback',
    summary,
    focusArea,
    recommendations,
    encouragement: 'Consistent micro-adjustments build lasting neuromuscular stamina.',
    aiExplanationUnavailable: true,
    disclaimer: 'PostureAI provides biomechanical awareness and ergonomic habit cues. It is not a medical diagnostic device.'
  };
}

/**
 * Communicates with the optional Gemini Posture API.
 * Gemini can ONLY be called after the local posture engine has calculated structured results.
 * If Gemini is unavailable (e.g. 503 UNAVAILABLE), gracefully returns deterministic feedback.
 */
export async function fetchPostureAISummary(params: StructuredPosturePayload): Promise<AISummaryResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout max

    const res = await fetch('/api/posture-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      // If 503 or any HTTP error, gracefully fallback
      return generateLocalDeterministicSummary(params);
    }

    const data: AISummaryResponse = await res.json();
    if (!data || !data.summary) {
      return generateLocalDeterministicSummary(params);
    }

    return data;
  } catch (_err) {
    // Network failure, timeout, or aborted — smoothly fallback without error alert
    return generateLocalDeterministicSummary(params);
  }
}
