import { Menu as BaseMenu } from "@base-ui/react/menu";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useOverlayContainer } from "./OverlayHost";

export function Menu({ children }: { children: ReactNode }) {
  return <BaseMenu.Root modal={false}>{children}</BaseMenu.Root>;
}

export function MenuTrigger({
  ariaLabel,
  children,
  className,
  title,
}: {
  ariaLabel: string;
  children: ReactNode;
  className: string;
  title?: string;
}) {
  return (
    <BaseMenu.Trigger aria-label={ariaLabel} className={className} title={title}>
      {children}
    </BaseMenu.Trigger>
  );
}

export function MenuContent({ children }: { children: ReactNode }) {
  const container = useOverlayContainer();
  return (
    <BaseMenu.Portal container={container}>
      <BaseMenu.Positioner align="end" sideOffset={4} className="z-50 outline-none">
        <BaseMenu.Popup finalFocus={false} className={popupClass}>
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

export function MenuItem({
  children,
  danger = false,
  disabled = false,
  onSelect,
}: {
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <BaseMenu.Item
      disabled={disabled}
      onClick={onSelect}
      className={`${itemClass} ${danger ? "text-danger" : ""}`}
    >
      {children}
    </BaseMenu.Item>
  );
}

export function MenuSeparator() {
  return <BaseMenu.Separator className="my-1 h-px bg-border" />;
}

export function MenuSub({ children }: { children: ReactNode }) {
  return <BaseMenu.SubmenuRoot>{children}</BaseMenu.SubmenuRoot>;
}

export function MenuSubTrigger({ children }: { children: ReactNode }) {
  return (
    <BaseMenu.SubmenuTrigger className={itemClass}>
      {children}
      <ChevronRight className="ml-auto size-3.5 text-muted" />
    </BaseMenu.SubmenuTrigger>
  );
}

export function MenuSubContent({ children }: { children: ReactNode }) {
  const container = useOverlayContainer();
  return (
    <BaseMenu.Portal container={container}>
      <BaseMenu.Positioner side="right" align="start" sideOffset={-2} className="z-50 outline-none">
        <BaseMenu.Popup finalFocus={false} className={popupClass}>
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

const popupClass =
  "min-w-40 rounded-md border border-border bg-surface p-1 text-sm text-text shadow-xl outline-none";

const itemClass =
  "flex min-h-8 cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-accent/15 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";
