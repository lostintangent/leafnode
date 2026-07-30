import type { ParselyProps } from "./types";

/** The host boundary for one mounted JSON editor. */
export function Parsely({ className, content }: ParselyProps) {
  return (
    <div className={className} data-parsely="">
      <pre>{content}</pre>
    </div>
  );
}
