import { Sparkles } from "lucide-react";
import { CONTAINER_TYPES, SCALAR_TYPES, type NewNodeType } from "../../../store";
import { MenuItem, MenuSeparator } from "../../ui/Menu";

// The child-type choices for a container's "Add" menu: "Ask agent" leads (set off by
// a divider) when the agent can generate the child, then the scalar types, then the
// containers — each labelled by its capitalized type name.
export function AddTypeItems({
  onAdd,
  onAskAgent,
}: {
  onAdd: (type: NewNodeType) => void;
  onAskAgent?: () => void;
}) {
  return (
    <>
      {onAskAgent && (
        <>
          <MenuItem onSelect={onAskAgent}>
            <Sparkles />
            Ask agent…
          </MenuItem>
          <MenuSeparator />
        </>
      )}
      {SCALAR_TYPES.map((type) => (
        <MenuItem key={type} onSelect={() => onAdd(type)}>
          {capitalize(type)}
        </MenuItem>
      ))}
      <MenuSeparator />
      {CONTAINER_TYPES.map((type) => (
        <MenuItem key={type} onSelect={() => onAdd(type)}>
          {capitalize(type)}
        </MenuItem>
      ))}
    </>
  );
}

/** "string" → "String" — the label the menu shows for a node type. */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
