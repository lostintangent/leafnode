# parsely

A small React JSON editor extracted from Toy Box.

```tsx
import { Parsely } from "@lostintangent/parsely";

<Parsely content={json} onContentChanged={setJson} />;
```

React, React DOM, TanStack Store, and TanStack React Store are peer dependencies. Parsely
bundles its own editor implementation and styling.
