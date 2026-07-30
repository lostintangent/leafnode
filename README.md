# 🌱 Leafnode

Leafnode is a JSON WYSIWYG for React, which tries to make viewing and editing content just a little bit more fun.

<img width="800px" src="https://github.com/user-attachments/assets/463138ca-b8ea-4eb7-97a8-346c4b97e2bd" />

> _Try it out:_ [web playground](https://lostintangent.github.io/leafnode).

## Features

1. Tree navigation
   1. Collapse individual nodes, expand/collapse all, and copy tree as JSON
   1. Rich type-specific rendering: syntax highlighting, formatted numbers, boolean checkboxes
   1. Hyperlinked node references (e.g. a `before` property pointing at an `id`)

1. Document editing
   1. Double-click to edit keys and values, along with undo/redo
   1. Add new object properties and array elements
   1. Drag-and-drop nodes and members to organize your data

1. AI collaboration
   1. Integrates with agents by requesting precise changes
   1. Running agents can indicate progress on nodes they're editing
   1. After agents edit the doc, added/updated nodes are highlighted

## Getting Started

```tsx
// npm/bun-install "@lostintangent/leafnode". And then...

import { Leafnode } from "@lostintangent/leafnode";

<Leafnode
  content={json}
  onContentChanged={setJson} // Omitting this makes the editor read-only
/>;
```

## Agent Requests

In order to allow agentic collaboration on the editor, you can pass an `agent` prop to the component, which is an object with two properites:

1. `activePointers` - A list of JSON pointers (e.g. `/settings/0/name`) which have an agent actively working on them. Note that you aren't expected to construct this list yourself, but rather, track it based on the requests made by the end-user (_see next property_).

1. `onRequest` - A callback that is run every time the end-user clicks the `Ask Agent...` menu item for a node. The callback will receive an object with two properties: `pointer` (the JSON pointer for the selected node) and `value` (the JSON value for the selected node). You are expected to take the pointer/value/associated file, construct a prompt and then allow the agent to mutate the file as appropriate. And while a request is active, you should pass the provided `pointer` back into the `activePointers` state so that the editor can track which requests are in flight and display a spinner next to the node.

> Note: Take a look at the `/playground` for an example of how to implement this contract.

## Theming

By default, Leafnode comes with a built-in light and dark theme, and will detect the end-users configured color scheme. But if you'd like to customize the theme for your app environment, simply set the `theme` prop to an object with the following four color tokens:

1. `accent` - Hover backgrounds, checkboxes, reference links, and active request spinners
1. `background` - Background color for the editor and hovers/menus
1. `muted` - Expand/collapse buttons, drag handles, node summaries, menu seperators, and `null` values
1. `text` - Text for node keys and menu items

> Note: The color for string/number/boolean values are currently fixed, but I can easily added theme tokens for those as needed.
