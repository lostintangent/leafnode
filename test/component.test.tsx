import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Parsely } from "../src";

test("Parsely renders a hydration-safe host on the server", () => {
  expect(renderToString(createElement(Parsely, { content: "{}" }))).toBe(
    '<div data-parsely=""></div>',
  );
});
