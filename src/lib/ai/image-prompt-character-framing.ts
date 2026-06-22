/** Pose sedute/accovacciate solo se richieste esplicitamente nel prompt utente. */
export const CHARACTER_SEATED_POSE_PATTERN =
  /\b(sedut[oa]|sedersi|in\s+poltrona|sulla\s+sedia|seduto\s+al|in\s+trono|seated|sitting(?:\s+on|\s+at|\s+in)?|on\s+a\s+(?:chair|throne|bench|stool)|at\s+a\s+desk\s+sitting|kneeling|inginocchiato|accovacciat[oa]|crouching|in\s+ginocchio)\b/i;

export function haystackRequestsSeatedPose(haystack: string): boolean {
  return CHARACTER_SEATED_POSE_PATTERN.test(haystack);
}

export const CREATURE_FULL_BODY_CROP_NEGATIVE_HINT =
  "cropped torso, bust-only shot, shoulders-up framing, face-only portrait, tight facial close-up, head-and-shoulders only composition, waist-up crop, missing feet, missing legs";

export const CREATURE_STANDING_POSE_NEGATIVE_HINT =
  "seated pose, sitting on chair, sitting on throne, sitting on bench, sitting at table, lounging in chair, slumped in seat";

export function buildCreatureTechnicalLine(
  entityType: "npc" | "monster",
  haystack: string
): string {
  const seated = haystackRequestsSeatedPose(haystack);
  if (entityType === "monster") {
    return seated
      ? "full-body fantasy creature illustration, entire figure visible including seated pose as described, photorealistic, cinematic lighting"
      : "full-body fantasy creature illustration, entire figure visible standing, head to toe in frame, photorealistic, cinematic lighting";
  }
  return seated
    ? "full-body fantasy character illustration, entire figure visible including seated pose as described, photorealistic, cinematic lighting"
    : "full-body fantasy character illustration, entire figure visible standing, head to toe in frame, neutral hero stance, photorealistic, cinematic lighting";
}

export function buildCreatureFullBodyNegativeHints(haystack: string): string {
  const parts = [CREATURE_FULL_BODY_CROP_NEGATIVE_HINT];
  if (!haystackRequestsSeatedPose(haystack)) {
    parts.push(CREATURE_STANDING_POSE_NEGATIVE_HINT);
  }
  return parts.join(", ");
}
