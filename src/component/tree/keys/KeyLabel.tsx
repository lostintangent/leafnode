import { isIdentityKey } from "./identity";

export function KeyLabel({ name }: { name: string }) {
  if (!isIdentityKey(name)) return name;
  return (
    <span
      className="rounded px-1 font-medium"
      style={{
        color: "var(--leafnode-accent)",
        backgroundColor: "color-mix(in srgb, var(--leafnode-accent) 14%, transparent)",
      }}
    >
      {name}
    </span>
  );
}
