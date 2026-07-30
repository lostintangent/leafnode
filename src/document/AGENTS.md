# JSON Document

The document subsystem lets Leafnode edit JSON and accept replacement content without resetting unchanged rows or disturbing object order. One identified JSON tree is the shared model for parsing, pure edits, and reconciliation. Internal IDs address live nodes, while RFC 6901 JSON Pointer strings describe portable locations in the JSON shape.

## Design Notes

- **Stable identities keep interactions attached to unchanged nodes.** One ID source spans the initial parse, local additions, and every external reparse, but IDs never enter serialized JSON. Edits use IDs because paths can move. External locations and change highlights use JSON Pointer strings because IDs are runtime-only.
- **The identified tree preserves JSON order and reusable structure.** Serialization walks the tree directly, retaining member order even for numeric-looking keys. Each edit rebuilds only the changed branch and returns the original root for a no-op, so rendering can stop at untouched subtrees.
- **One-pass reconciliation preserves continuity across host snapshots.** It takes identities and reusable references from `current`, shape and values from `incoming`, matches objects by key and arrays by position, and returns the next root with pointer-keyed additions and changes. Removals have no surviving row to mark.
- **Editor policy stays above the document.** State owns read-only enforcement, generated keys, history, and publication. Rendering owns inferred reference links and other projections. Neither changes JSON semantics.

## Subsystem Map

- `tree.ts` owns the tree shape, runtime identities, constructors, queries, and JSON Pointer construction.
- `parser.ts` owns parsing and serialization at the JSON text boundary.
- `edit.ts` owns pure local transformations and structural sharing.
- `reconcile.ts` owns external snapshot reconciliation and structural changes.
- `index.ts` owns the subsystem facade.
