// An RFC 6901 JSON Pointer names a location independently of node identity, so it
// survives a re-parse that node ids do not. Consumers treat the resulting string
// as an opaque address.

/** The document root, addressed by the empty pointer. */
export const ROOT_POINTER = "";

/** Extend a pointer by one step — an object key or an array index. */
export function childPointer(parent: string, step: string | number): string {
  return `${parent}/${escapeToken(String(step))}`;
}

function escapeToken(token: string): string {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}
