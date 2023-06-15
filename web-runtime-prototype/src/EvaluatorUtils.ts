import * as Ast from "./AstNode";

export function apply_binop(
  op: Ast.BinaryOpType,
  first: Ast.LiteralType,
  second: Ast.LiteralType
): Ast.LiteralType {
    
    if (!( typeof first == "number"
        && typeof second == "number")) {
        throw new Error(
            `Expected ${'number'}, got `
            + `first=${first}, second=${second}`);
    }

    switch (op) {
        case "+": return first + second;
        case "-": return first - second;
        case "*": return first * second;
        case "%": return first % second;
        default: break;
    }
    throw new Error(`Unhandled binary op ${op}`);
}
