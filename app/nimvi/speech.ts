export const MIN_SPEECH_COLUMNS = 18;
export const MAX_SPEECH_COLUMNS = 42;
export const SPEECH_DURATION_MS = 1_800;

export function speechBubbleColumns(text: string) {
  return Math.max(MIN_SPEECH_COLUMNS, Math.min(MAX_SPEECH_COLUMNS, Math.ceil(text.trim().length * 0.72)));
}
