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
      var \`x\` = 10;
      var \`y\` = 20;
      {
        var \`z hello\` = x + y;
        \`z hello\`
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
