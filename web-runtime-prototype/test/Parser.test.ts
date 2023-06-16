import { describe, expect, test } from "@jest/globals";
import { lex } from "../src/Lexer";
import { parse } from "../src/Parser";
import * as Ast from "../src/AstNode";

describe("Parser", () => {
  test("Variable declarations", () => {
    const test_string = `
      var a = 10;
      var b = 20;
    `;
    const ast = parse(lex(test_string));

    const test_stmts = Array<Ast.Stmt>();
    test_stmts.push(new Ast.ConstDecl("a", new Ast.Literal(10)));
    test_stmts.push(new Ast.ConstDecl("b", new Ast.Literal(20)));
    const test_block = new Ast.Block(test_stmts);

    expect(ast.toString()).toBe(test_block.toString());
  });
});
