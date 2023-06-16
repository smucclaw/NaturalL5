import * as Ast from "./AstNode";

export function binop_apply(
  op: Ast.BinaryOpType,
  first: Ast.LiteralType,
  second: Ast.LiteralType
): number | boolean {
  if (!(typeof first == "number" && typeof second == "number")) {
    throw new Error(
      `Incompatible binary op. ` +
        `Expected ${"number"}, got ` +
        `first=${first}, second=${second}`
    );
  }

  switch (op) {
    case "+":
      return first + second;
    case "-":
      return first - second;
    case "*":
      return first * second;
    case "%":
      return first % second;
    case "<":
      return first < second;
    case "<=":
      return first <= second;
    case ">":
      return first > second;
    case ">=":
      return first >= second;
    case "==":
      return first == second;
    default:
      break;
  }
  throw new Error(`Unhandled binary op ${op}`);
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
      throw new Error(`Unhandled unary op ${op}`);
  }
  throw new Error(`Incompatible unary op. op=${op}, first=${first}`);
}

export function logicalcomp_eval_second(
  op: Ast.LogicalCompositionType,
  first: Ast.LiteralType
): boolean {
  if (!(typeof first == "boolean")) {
    throw new Error(
      `Incompatible logical composition. ` +
        `Expected ${`boolean`}, got first=${first}`
    );
  }

  switch (op) {
    case "&&":
      return first ? true : false;
    case "||":
      return first ? false : true;
    default:
      break;
  }
  throw new Error(`Unhandled logicalcomp op ${op}`);
}

export function logicalcomp_apply(
  op: Ast.LogicalCompositionType,
  first: Ast.LiteralType,
  second: Ast.LiteralType
): boolean {
  if (!(typeof first == "boolean" && typeof second == "boolean")) {
    throw new Error(
      `Incompatible logical composition. ` +
        `Expected ${"boolean"}, got ` +
        `first=${first}, second=${second}`
    );
  }

  switch (op) {
    case "&&":
      return first && second;
    case "||":
      return first || second;
    default:
      break;
  }
  throw new Error(`Unhandled logicalcomp op ${op}`);
}

export function attrib_apply(
  attrib: string,
  obj: Ast.LiteralType
): Ast.AstNode {
  if (!(typeof obj == "object" && obj instanceof Ast.CompoundLiteral)) {
    throw new Error(
      `Incompatible attribute access. ` +
        `Expected ${"CompoundLiteral"}, got ` +
        `obj=${obj}`
    );
  }

  const maybe_attrib = obj.lookup(attrib);
  if (maybe_attrib == undefined)
    throw new Error(`CompoundLiteral ${obj.sym} has no attribute ${attrib}`);
  return maybe_attrib;
}
