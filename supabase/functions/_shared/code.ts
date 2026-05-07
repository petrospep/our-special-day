const CHARS = "abcdefghijkmnopqrstuvwxyz23456789";

export function generateInviteCode(length = 10) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let value = "";

  for (const byte of bytes) {
    value += CHARS[byte % CHARS.length];
  }

  return `w-${value}`;
}
