import type { NormalizedScrapedEvent } from "@/server/hub-scrapers/types";

export type KidFriendlyEvidence = {
  decision: boolean;
  positiveEvidence: string[];
  blockingReasons: string[];
  hasConflict: boolean;
};

type KidFriendlyInput = Pick<
  NormalizedScrapedEvent,
  "title" | "description" | "tags" | "isKidFriendly"
>;

const POSITIVE_PATTERNS = [
  ["explicit family-friendly wording", /\b(?:family[- ]friendly|for (?:the )?whole family|all ages)\b/i],
  ["children or youth audience", /\b(?:bab(?:y|ies)|child(?:ren)?|kids?|preschool(?:ers)?|toddlers?|tweens?|youth)\b/i],
  ["explicit teen audience", /\b(?:for teens?|teen program|teen night|ages? 1[3-7])\b/i],
] as const;

const BLOCKING_PATTERNS = [
  ["adults-only or age-restricted admission", /\b(?:adults? only|mature audiences?|ages? (?:18|21)\+?|18\+|21\+|must be (?:18|21)|no minors?)\b/i],
  ["sexual or explicit content", /\b(?:sexual (?:content|themes?|violence)|explicit(?: content)?|nudity|erotic|burlesque|strip(?:per|tease)?)\b/i],
  ["suicide or self-harm content", /\b(?:suicide|self[- ]harm)\b/i],
  ["violence or abuse", /\b(?:violence|domestic violence|sexual abuse|child abuse|rape|murder)\b/i],
  ["mature-content warning", /\b(?:mature (?:content|themes?|audiences?)|content warning|trigger warning|parental advisory|viewer discretion)\b/i],
] as const;

/**
 * Applies the public kid-friendly safety policy to normalized scraper content.
 * Positive language is required, and any mature-content signal wins over it.
 */
export function evaluateKidFriendlySafety(
  event: KidFriendlyInput,
): KidFriendlyEvidence {
  const text = [event.title, event.description, ...(event.tags ?? [])]
    .filter(Boolean)
    .join(" ");
  const positiveEvidence = POSITIVE_PATTERNS
    .filter(([, pattern]) => pattern.test(text))
    .map(([reason]) => reason);
  const blockingReasons = BLOCKING_PATTERNS
    .filter(([, pattern]) => pattern.test(text))
    .map(([reason]) => reason);

  const hasPositiveEvidence = positiveEvidence.length > 0;
  const hasConflict = blockingReasons.length > 0 &&
    (event.isKidFriendly === true || hasPositiveEvidence);

  return {
    decision: hasPositiveEvidence && blockingReasons.length === 0,
    positiveEvidence,
    blockingReasons,
    hasConflict,
  };
}
