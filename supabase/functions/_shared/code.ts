import {
  INVITE_CODE_PREFIXES,
  INVITE_CODE_SUFFIX_CHARS,
  INVITE_CODE_SUFFIX_LENGTH,
} from "./invite-code-word-pool.ts";

function randomIndex(max: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(1));

  return bytes[0] % max;
}

export function generateInviteCode(length = INVITE_CODE_SUFFIX_LENGTH) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  const prefix = INVITE_CODE_PREFIXES[randomIndex(INVITE_CODE_PREFIXES.length)].toLowerCase();
  let value = "";

  for (const byte of bytes) {
    value += INVITE_CODE_SUFFIX_CHARS[byte % INVITE_CODE_SUFFIX_CHARS.length];
  }

  return `${prefix}-${value}`;
}
