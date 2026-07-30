import type { JsonNode } from "../../../document";
import type { LeafnodeStore } from "../../../state";
import { BooleanValue } from "./scalars/BooleanValue";
import { NumberValue } from "./scalars/NumberValue";
import { StringValue } from "./scalars/StringValue";
import { valueColor, valueText } from "./scalars/text";

type ScalarNode = Extract<JsonNode, { kind: "scalar" }>;

export function ScalarValue({
  store,
  memberKey,
  node,
  readOnly,
}: {
  store: LeafnodeStore;
  memberKey: string | null;
  node: ScalarNode;
  readOnly: boolean;
}) {
  const { value } = node;
  const onEdit = readOnly ? undefined : () => store.actions.beginEdit("value", node.id);

  if (value === null) {
    return (
      <span
        className={`min-w-0 truncate ${onEdit ? "cursor-text" : ""}`}
        style={{ color: valueColor(value) }}
        onDoubleClick={onEdit}
        title={onEdit ? "Double-click to edit" : undefined}
      >
        {valueText(value)}
      </span>
    );
  }
  if (typeof value === "boolean") {
    return (
      <BooleanValue
        value={value}
        readOnly={readOnly}
        onChange={(checked) => store.actions.replaceValue(node.id, checked)}
      />
    );
  }
  if (typeof value === "string") {
    return <StringValue store={store} memberKey={memberKey} onEdit={onEdit} value={value} />;
  }
  return <NumberValue value={value} onEdit={onEdit} />;
}
