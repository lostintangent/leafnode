import { Check } from "lucide-react";

export function Checkbox({
  ariaLabel,
  checked,
  disabled,
  onChange,
}: {
  ariaLabel: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <span className="relative flex size-4 shrink-0 items-center justify-center">
      <input
        type="checkbox"
        aria-label={ariaLabel}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer size-4 appearance-none rounded-[4px] border border-muted bg-background outline-none transition-colors checked:border-accent checked:bg-accent focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Check className="pointer-events-none absolute size-3 text-white opacity-0 peer-checked:opacity-100" />
    </span>
  );
}
