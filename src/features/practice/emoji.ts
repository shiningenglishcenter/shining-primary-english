/**
 * Pictures come from Microsoft Fluent Emoji 3D (MIT), served by this app from
 * /emoji/<code>.webp (copied from @lobehub/fluent-emoji-3d at build time by
 * scripts/copy-emoji.mjs). The database stores the code, e.g. "1f408" for 🐈
 * or "1f441-fe0f" for 👁️ — every code point of the emoji, in hex, joined by "-".
 */

export const EMOJI_CODE_PATTERN = /^[0-9a-f]{4,6}(-[0-9a-f]{4,6}){0,6}$/;

export function emojiToCode(emoji: string): string {
  return Array.from(emoji.trim())
    .map((ch) => ch.codePointAt(0)!.toString(16).padStart(4, "0"))
    .join("-");
}

export function codeToEmoji(code: string): string {
  return String.fromCodePoint(...code.split("-").map((h) => parseInt(h, 16)));
}

export function emojiSrc(code: string | null | undefined): string | null {
  return code && EMOJI_CODE_PATTERN.test(code) ? `/emoji/${code}.webp` : null;
}
