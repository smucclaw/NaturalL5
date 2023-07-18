import { describe, expect, test } from "@jest/globals";
import { EvaluatorContext } from "../src/Evaluator";
import { OutputEvent, EventResult } from "../src/CallbackEvent";

`
Should test for:
1) Regular usage
2) Validating & Invalidting calls
3) Calculations
4) Error Messages (TODO)
`;

describe("Evaluator", () => {
  test("Test", () => {
    const test_code = `
      \`x\` = 10;
      \`y\` = 20;
      {
        \`z\` = x + y;
        z
      }
    `;

    const ctx = EvaluatorContext.from_program(test_code, (x: OutputEvent) => {
      if (x instanceof EventResult) {
        const result = x.result as number;
        expect(result).toBe(30);
      }
    });
    ctx.evaluate();
  });
});
