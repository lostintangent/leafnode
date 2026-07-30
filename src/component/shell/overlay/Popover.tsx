import { Popover as BasePopover } from "@base-ui/react/popover";
import type { ReactNode } from "react";
import { useOverlayContainer } from "./OverlayHost";

export function Popover({
  children,
  onOpenChange,
  open,
}: {
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <BasePopover.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </BasePopover.Root>
  );
}

export function PopoverTrigger({
  children,
  className,
  onClick,
  title,
}: {
  children: ReactNode;
  className: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <BasePopover.Trigger
      openOnHover
      delay={300}
      closeDelay={80}
      className={className}
      title={title}
      onClick={(event) => {
        event.preventBaseUIHandler();
        onClick();
      }}
    >
      {children}
    </BasePopover.Trigger>
  );
}

export function PopoverContent({ children }: { children: ReactNode }) {
  const container = useOverlayContainer();
  return (
    <BasePopover.Portal container={container}>
      <BasePopover.Positioner side="top" align="start" sideOffset={6} className="z-50 outline-none">
        <BasePopover.Popup
          initialFocus={false}
          finalFocus={false}
          className="w-fit max-w-sm rounded-md border border-border bg-surface p-2 text-text shadow-xl outline-none"
        >
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}
