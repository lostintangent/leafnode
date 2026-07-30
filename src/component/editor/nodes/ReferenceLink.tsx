import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Entity } from "../../../document";
import { useParselyTheme } from "../../theme";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/Popover";
import { NodePreview } from "./NodePreview";

// A reference rendered as its target: click to jump there, hover to peek at it. The
// preview is a read-only card, so the popover is anchored and hover-controlled rather
// than click-triggered — a click navigates instead of toggling a panel.

export function ReferenceLink({
  text,
  target,
  onJump,
}: {
  text: string;
  target: Entity;
  onJump: () => void;
}) {
  const { theme } = useParselyTheme();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onPress={() => {
          setOpen(false);
          onJump();
        }}
        className="min-w-0 cursor-pointer truncate underline-offset-2 hover:underline"
        title="Jump to definition"
      >
        <span style={{ color: theme.accent }}>{text}</span>
        <ArrowUpRight
          className="ml-0.5 inline size-3 align-middle"
          style={{ color: theme.accent }}
        />
      </PopoverTrigger>
      <PopoverContent>
        <NodePreview node={target.node} />
      </PopoverContent>
    </Popover>
  );
}
