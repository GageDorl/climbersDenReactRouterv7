export const DEFAULT_BLOCKED_WORDS = [
  'fuck', 'shit', 'damn', 'bastard', 'asshole', 'bitch'
];

export function censorText(input?: string | null, blockedWords: string[] = DEFAULT_BLOCKED_WORDS): string {
  if (!input) return '';
  try {
    // Build a regex that matches whole words case-insensitively
    const escaped = blockedWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = `\\b(${escaped.join('|')})\\b`;
    const re = new RegExp(pattern, 'gi');
    return input.replace(re, (match) => '*'.repeat(match.length));
  } catch (e) {
    // If something goes wrong, fail open by returning original text
    return input;
  }
}
