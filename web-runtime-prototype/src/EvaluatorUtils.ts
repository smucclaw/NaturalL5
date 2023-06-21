import * as Ast from "./AstNode";
import { assertion } from "./utils";

export function binop_apply(
  op: Ast.BinaryOpType,
  first: Ast.LiteralType,
  second: Ast.LiteralType
): number | boolean {
  assertion(
    () => typeof first == "number" && typeof second == "number",
    `Incompatible binary op. ` +
      `Expected ${"number"}, got ` +
      `first=${first}, second=${second}`
  );
  const f = first as number;
  const s = second as number;

  switch (op) {
    case "+":
      return f + s;
    case "-":
      return f - s;
    case "*":
      return f * s;
    case "%":
      return f % s;
    case "/":
      return Math.floor(f / s);
    case "<":
      return f < s;
    case "<=":
      return f <= s;
    case ">":
      return f > s;
    case ">=":
      return f >= s;
    case "==":
      return f == s;
    case "!=":
      return f != s;
    default:
      break;
  }
  assertion(() => false, `Unhandled binary op ${op}`);
  throw null;
}

export function unop_apply(
  op: Ast.UnaryOpType,
  first: Ast.LiteralType
): number | boolean {
  switch (op) {
    case "-":
      if (typeof first == "number") return -first;
      break;
    case "!":
      if (typeof first == "boolean") return !first;
      break;
    default:
      break;
  }
  assertion(() => false, `Incompatible unary op. op=${op}, first=${first}`);
  throw null;
}

export function logicalcomp_eval_second(
  op: Ast.LogicalCompositionType,
  first: Ast.LiteralType
): boolean {
  assertion(
    () => typeof first == "boolean",
    `Incompatible logical composition. ` +
      `Expected ${`boolean`}, got first=${first}`
  );
  const f = first as boolean;
  switch (op) {
    case "&&":
      return f ? true : false;
    case "||":
      return f ? false : true;
    default:
      break;
  }
  assertion(() => false, `Unhandled logicalcomp op ${op}`);
  throw null;
}

export function logicalcomp_apply(
  op: Ast.LogicalCompositionType,
  first: Ast.LiteralType,
  second: Ast.LiteralType
): boolean {
  assertion(
    () => typeof first == "boolean" && typeof second == "boolean",
    `Incompatible logical composition. ` +
      `Expected ${"boolean"}, got ` +
      `first=${first}, second=${second}`
  );
  const f = first as boolean;
  const s = second as boolean;

  switch (op) {
    case "&&":
      return f && s;
    case "||":
      return f || s;
    default:
      break;
  }
  assertion(() => false, `Unhandled logicalcomp op ${op}`);
  throw null;
}

export function attrib_apply(
  attrib: string,
  obj: Ast.LiteralType
): Ast.AstNode {
  assertion(
    () => typeof obj == "object" && obj instanceof Ast.CompoundLiteral,
    `Incompatible attribute access. ` +
      `Expected ${"CompoundLiteral"}, got ` +
      `obj=${obj}`
  );
  const o = obj as Ast.CompoundLiteral;
  const maybe_attrib = o.lookup(attrib);
  assertion(
    () => maybe_attrib != undefined,
    `CompoundLiteral ${o.sym} has no attribute ${attrib}`
  );
  return maybe_attrib!;
}
