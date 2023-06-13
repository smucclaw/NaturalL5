import { describe, expect, test } from "@jest/globals";
import { f } from "../src/index";

describe("Testing f", () => {
  test("Output of f has to be 1", () => {
    expect(f()).toBe(1);
  });
});
