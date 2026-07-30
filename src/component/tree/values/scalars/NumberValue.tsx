import { valueColor } from "./text";

const NUMBER_FORMATTER = new Intl.NumberFormat(undefined, {
  // Avoid Intl's default fractional rounding while keeping locale grouping.
  maximumSignificantDigits: 21,
});

export function NumberValue({ value, onEdit }: { value: number; onEdit?: () => void }) {
  return (
    <span
      className={`min-w-0 truncate ${onEdit ? "cursor-text" : ""}`}
      style={{ color: valueColor(value) }}
      onDoubleClick={onEdit}
      title={onEdit ? "Double-click to edit" : undefined}
    >
      {NUMBER_FORMATTER.format(value)}
    </span>
  );
}
