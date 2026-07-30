import { useEffect, useRef, useState } from "react";

// `onCommit` can reject invalid input and keep the field open. Escape cancels;
// blur commits or cancels a rejection so focus is never trapped.

export function InlineEdit({
  initial,
  onCommit,
  onCancel,
  ariaLabel,
  color,
}: {
  initial: string;
  onCommit: (text: string) => boolean;
  onCancel: () => void;
  ariaLabel: string;
  color?: string;
}) {
  const [text, setText] = useState(initial);
  const [invalid, setInvalid] = useState(false);
  const settled = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  function tryCommit(onReject: () => void): void {
    if (settled.current) return;
    if (onCommit(text)) settled.current = true;
    else onReject();
  }

  return (
    <input
      ref={inputRef}
      value={text}
      aria-label={ariaLabel}
      spellCheck={false}
      autoComplete="off"
      className="min-w-0 rounded-sm bg-background px-1 font-mono text-[13px] leading-6 outline-none"
      style={{
        color,
        width: `${Math.max(text.length + 1, 2)}ch`,
        boxShadow: `0 0 0 1.5px var(${invalid ? "--leafnode-danger" : "--leafnode-accent"})`,
      }}
      onChange={(event) => {
        setText(event.target.value);
        setInvalid(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          tryCommit(() => setInvalid(true));
        } else if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => tryCommit(onCancel)}
    />
  );
}
