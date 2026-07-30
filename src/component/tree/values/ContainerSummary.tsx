import { childCount, type JsonNode, type JsonScalar } from "../../../document";
import { declaredId } from "../keys/identity";
import { valueText } from "./scalars/text";

type ContainerNode = Exclude<JsonNode, { kind: "scalar" }>;

// Expanded containers show their child count. Collapsed objects prefer a declared
// id, while collapsed arrays preview their first values.

const PREVIEW_ITEMS = 2;
const MAX_ITEM_CHARS = 16;

export function ContainerSummary({ node, collapsed }: { node: ContainerNode; collapsed: boolean }) {
  const [open, close] = node.kind === "array" ? ["[", "]"] : ["{", "}"];
  const inner = collapsed ? collapsedSummary(node) : countLabel(node);
  return (
    <span className="text-muted">
      {open}
      {inner && ` ${inner} `}
      {close}
    </span>
  );
}

function collapsedSummary(node: ContainerNode): string {
  if (node.kind === "object") return declaredId(node) ?? countLabel(node);
  return arrayPreview(node.items);
}

function arrayPreview(items: readonly JsonNode[]): string {
  const shown = items.slice(0, PREVIEW_ITEMS).map(itemToken).join(", ");
  const rest = items.length - PREVIEW_ITEMS;
  return rest > 0 ? `${shown}, +${rest}` : shown;
}

function itemToken(node: JsonNode): string {
  const text =
    node.kind === "scalar"
      ? scalarToken(node.value)
      : node.kind === "object"
        ? (declaredId(node) ?? "{…}")
        : "[…]";
  return text.length > MAX_ITEM_CHARS ? `${text.slice(0, MAX_ITEM_CHARS)}…` : text;
}

function scalarToken(value: JsonScalar): string {
  return typeof value === "string" ? JSON.stringify(value) : valueText(value);
}

function countLabel(node: ContainerNode): string {
  const count = childCount(node);
  return count > 0 ? String(count) : "";
}
