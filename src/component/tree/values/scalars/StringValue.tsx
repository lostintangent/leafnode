import { useSelector } from "@tanstack/react-store";
import type { LeafnodeStore } from "../../../../state";
import { ReferenceLink } from "../references/ReferenceLink";
import { resolveReference, type ReferenceTarget } from "../references/resolve";
import { valueColor } from "./text";

export function StringValue({
  store,
  memberKey,
  onEdit,
  value,
}: {
  store: LeafnodeStore;
  memberKey: string | null;
  onEdit?: () => void;
  value: string;
}) {
  const target = useSelector(
    store,
    (state) => (state.root ? resolveReference(state.root, memberKey, value) : null),
    { compare: sameReferenceTarget },
  );

  if (target) {
    return <ReferenceLink store={store} target={target} value={value} />;
  }

  return (
    <span
      className={`min-w-0 truncate ${onEdit ? "cursor-text" : ""}`}
      style={{ color: valueColor(value) }}
      onDoubleClick={onEdit}
      title={onEdit ? "Double-click to edit" : undefined}
    >
      <span className="text-muted">&quot;</span>
      {value}
      <span className="text-muted">&quot;</span>
    </span>
  );
}

function sameReferenceTarget(
  previous: ReferenceTarget | null,
  next: ReferenceTarget | null,
): boolean {
  if (previous === next) return true;
  if (!previous || !next || previous.node !== next.node) return false;
  if (previous.ancestorIds.length !== next.ancestorIds.length) return false;
  return previous.ancestorIds.every((id, index) => id === next.ancestorIds[index]);
}
