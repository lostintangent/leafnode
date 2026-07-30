import { describe, expect, test } from "bun:test";
import {
  arrayNode,
  childPointer,
  descendantContainerIds,
  objectNode,
  ROOT_POINTER,
  scalarNode,
} from "../../src/document";

describe("JSON tree addressing", () => {
  test("addresses the root as the empty pointer", () => {
    expect(ROOT_POINTER).toBe("");
  });

  test("extends by object key and array index", () => {
    expect(childPointer(ROOT_POINTER, "user")).toBe("/user");
    expect(childPointer("/user", "roles")).toBe("/user/roles");
    expect(childPointer("/user/roles", 0)).toBe("/user/roles/0");
  });

  test("escapes reserved characters in keys per RFC 6901", () => {
    expect(childPointer(ROOT_POINTER, "a/b")).toBe("/a~1b");
    expect(childPointer(ROOT_POINTER, "a~b")).toBe("/a~0b");
  });

  test("collects container descendants without the root or scalar leaves", () => {
    const nested = objectNode("nested");
    const array = arrayNode("array", [nested, scalarNode("scalar", true)]);
    const root = objectNode("root", [{ key: "items", node: array }]);

    expect(descendantContainerIds(root)).toEqual(new Set(["array", "nested"]));
  });
});
