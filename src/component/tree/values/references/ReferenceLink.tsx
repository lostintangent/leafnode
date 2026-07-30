import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { childCount, type JsonNode } from "../../../../document";
import type { LeafnodeStore } from "../../../../state";
import { Popover, PopoverContent, PopoverTrigger } from "../../../shell/overlay/Popover";
import { KeyLabel } from "../../keys/KeyLabel";
import { ContainerSummary } from "../ContainerSummary";
import { ScalarValue } from "../ScalarValue";
import type { ReferenceTarget } from "./resolve";

type ContainerNode = Exclude<JsonNode, { kind: "scalar" }>;

const MAX_DEPTH = 3;
const INDENT_PX = 12;

export function ReferenceLink({
  store,
  target,
  value,
}: {
  store: LeafnodeStore;
  target: ReferenceTarget;
  value: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onClick={() => {
          setOpen(false);
          store.actions.reveal(target.node.id, target.ancestorIds);
        }}
        className="min-w-0 cursor-pointer truncate underline-offset-2 hover:underline"
        title="Jump to definition"
      >
        <span className="text-accent">{value}</span>
        <ArrowUpRight className="ml-0.5 inline size-3 align-middle text-accent" />
      </PopoverTrigger>
      <PopoverContent>
        <ReferencePreview store={store} node={target.node} />
      </PopoverContent>
    </Popover>
  );
}

// The reference card shows a target's contents with the tree's read-only value
// rendering, but omits the target's own container row and limits nested depth.
export function ReferencePreview({
  store,
  node,
}: {
  store: LeafnodeStore;
  node: ReferenceTarget["node"];
}) {
  return (
    <div className="max-h-72 overflow-auto font-mono text-[13px] leading-6">
      <PreviewChildren store={store} node={node} depth={0} />
    </div>
  );
}

function PreviewRow({
  store,
  node,
  memberKey,
  depth,
}: {
  store: LeafnodeStore;
  node: JsonNode;
  memberKey?: string;
  depth: number;
}) {
  const showChildren = node.kind !== "scalar" && depth < MAX_DEPTH && childCount(node) > 0;

  return (
    <>
      <div
        className="flex items-center gap-1 whitespace-nowrap"
        style={{ paddingLeft: depth * INDENT_PX }}
      >
        {memberKey !== undefined && (
          <span className="shrink-0 text-text">
            <KeyLabel name={memberKey} />
            <span className="text-muted">: </span>
          </span>
        )}
        {node.kind === "scalar" ? (
          <ScalarValue store={store} memberKey={memberKey ?? null} node={node} readOnly />
        ) : (
          <ContainerSummary node={node} collapsed={!showChildren} />
        )}
      </div>

      {showChildren && <PreviewChildren store={store} node={node} depth={depth + 1} />}
    </>
  );
}

function PreviewChildren({
  store,
  node,
  depth,
}: {
  store: LeafnodeStore;
  node: ContainerNode;
  depth: number;
}) {
  return (
    <>
      {node.kind === "object"
        ? node.members.map((member) => (
            <PreviewRow
              key={member.node.id}
              store={store}
              node={member.node}
              memberKey={member.key}
              depth={depth}
            />
          ))
        : node.items.map((item) => (
            <PreviewRow key={item.id} store={store} node={item} depth={depth} />
          ))}
    </>
  );
}
