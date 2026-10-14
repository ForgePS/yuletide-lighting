export type TourNarrationInput = {
  title: string;
  description: string;
  narration?: string | null;
};

/** Spoken script for a tour step (custom narration or title + description). */
export function buildStepNarration(input: TourNarrationInput): string {
  const custom = input.narration?.trim();
  if (custom) return custom;
  return `${input.title}. ${input.description}`.trim();
}

/** Fallback duration when the browser cannot speak (≈155 wpm + buffer). */
export function estimateNarrationDurationMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const speechMs = Math.round((words / 155) * 60_000);
  return Math.max(2_500, speechMs + 600);
}

export type NarrationVoiceCandidate = {
  name: string;
  lang: string;
  localService?: boolean;
};

const PREFERRED_FEMALE_VOICE_PATTERNS = [
  /\bzira\b/i,
  /\bjenny\b/i,
  /\baria\b/i,
  /\bsamantha\b/i,
  /\bkaren\b/i,
  /\bsusan\b/i,
  /\bfiona\b/i,
  /\bvictoria\b/i,
  /\bhazel\b/i,
  /\blaura\b/i,
  /\bmichelle\b/i,
  /\bnatasha\b/i,
  /\bemma\b/i,
  /\bserena\b/i,
  /\bsonia\b/i,
  /\bgoogle us english\b/i,
  /\bfemale\b/i,
];

const MALE_VOICE_PATTERNS = [
  /\bdavid\b/i,
  /\bmark\b/i,
  /\bgeorge\b/i,
  /\bjames\b/i,
  /\bguy\b/i,
  /\bmale\b/i,
];

/** Higher scores are preferred for tour narration. */
export function scoreNarrationVoice(voice: NarrationVoiceCandidate): number {
  let score = 0;
  const lang = voice.lang.toLowerCase();

  if (lang.startsWith('en-us')) score += 40;
  else if (lang.startsWith('en-gb')) score += 30;
  else if (lang.startsWith('en')) score += 20;

  if (PREFERRED_FEMALE_VOICE_PATTERNS.some((pattern) => pattern.test(voice.name))) {
    score += 60;
  }

  if (/natural|neural|premium|online/i.test(voice.name)) score += 25;
  if (voice.localService) score += 10;

  if (MALE_VOICE_PATTERNS.some((pattern) => pattern.test(voice.name))) {
    score -= 80;
  }

  return score;
}

export function pickNarrationVoice<T extends NarrationVoiceCandidate>(voices: T[]): T | null {
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
  if (english.length === 0) return null;
  return [...english].sort((a, b) => scoreNarrationVoice(b) - scoreNarrationVoice(a))[0] ?? null;
}
