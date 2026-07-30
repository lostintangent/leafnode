# parsely

A small React JSON editor extracted from Toy Box.

```tsx
import { Parsely } from "@lostintangent/parsely";

<Parsely content={json} onContentChanged={setJson} />;
```

Omit `onContentChanged` for a read-only editor. `theme` accepts one four-token theme or a
light/dark pair. `agent.renderPrompt` and `renderToolbar` let a host supply workflow and pane
chrome without exposing Parsely's internal store.

React, React DOM, TanStack Store, and TanStack React Store are peer dependencies. Parsely
bundles its private Base UI behavior, icons, and shadow-isolated styling.
