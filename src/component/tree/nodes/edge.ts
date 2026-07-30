/** The parent context a rendered node needs but the JSON tree does not carry. */
export type Edge =
  | { kind: "root" }
  | { kind: "member"; parentId: string; index: number; count: number; key: string }
  | { kind: "item"; parentId: string; index: number; count: number };
