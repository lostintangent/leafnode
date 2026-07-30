import { describe, expect, test } from "bun:test";
import {
  createIdFactory,
  objectNode,
  parseDocument,
  scalarNode,
  serializeDocument,
} from "../../src/document";

function parse(source: string) {
  const result = parseDocument(source, createIdFactory());
  if (!result.ok) throw new Error(`expected a valid parse: ${result.error}`);
  return result.root;
}

describe("JSON document parser", () => {
  test("round-trips arbitrary JSON to an equal value", () => {
    const source = '{"name":"x","nums":[1,2.5,-3],"flags":[true,false,null],"nested":{"a":{}}}';

    expect(JSON.parse(serializeDocument(parse(source)))).toEqual(JSON.parse(source));
  });

  test("pretty-prints with two-space indent and a trailing newline", () => {
    const value = { title: "Report", tags: ["a", "b"], meta: { open: true } };

    expect(serializeDocument(parse(JSON.stringify(value)))).toBe(
      `${JSON.stringify(value, null, 2)}\n`,
    );
  });

  test("preserves the model's member order, including numeric-looking keys", () => {
    const root = objectNode("root", [
      { key: "10", node: scalarNode("ten", 10) },
      { key: "2", node: scalarNode("two", 2) },
      { key: "name", node: scalarNode("name", "Leafnode") },
    ]);

    expect(serializeDocument(root)).toBe('{\n  "10": 10,\n  "2": 2,\n  "name": "Leafnode"\n}\n');
  });

  test("renders empty containers inline", () => {
    expect(serializeDocument(parse("{}"))).toBe("{}\n");
    expect(serializeDocument(parse("[]"))).toBe("[]\n");
  });

  test("defaults empty or whitespace-only source to an empty object", () => {
    const result = parseDocument("   \n", createIdFactory());

    expect(result).toEqual({ ok: true, root: { id: "n0", kind: "object", members: [] } });
  });

  test("reports invalid JSON instead of throwing", () => {
    const result = parseDocument("{ not json", createIdFactory());

    expect(result.ok).toBe(false);
  });

  test("assigns identities in document pre-order", () => {
    const root = parse('{"a":1}');

    expect(root.id).toBe("n0");
    expect(root.kind === "object" && root.members[0].node.id).toBe("n1");
  });
});
