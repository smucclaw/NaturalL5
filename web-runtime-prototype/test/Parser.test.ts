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

  test("Function declarations", () => {
    const test_string = `
      function f(x, y, z) {
        ((x + y) + z)
      }
    `;
    const ast = parse(lex(test_string));

    const test_stmts = Array<Ast.Stmt>();
    test_stmts.push(
      new Ast.ConstDecl(
        "f",
        new Ast.Literal(
          new Ast.FunctionLiteral(
            ["x", "y", "z"],
            new Ast.Block([
              new Ast.ExpressionStmt(
                new Ast.BinaryOp(
                  "+",
                  new Ast.BinaryOp("+", new Ast.Name("x"), new Ast.Name("y")),
                  new Ast.Name("z")
                )
              ),
            ])
          )
        )
      )
    );
    const test_block = new Ast.Block(test_stmts);

    expect(ast.toString()).toBe(test_block.toString());
  });

  test("CompoundLiteral instances", () => {
    const test_string = `
      var person = Person {
        x = 10;
        y = 20;
        z = 30;
      };
    `;
    const ast = parse(lex(test_string));

    const test_stmts = Array<Ast.Stmt>();
    test_stmts.push(
      new Ast.ConstDecl(
        "person",
        new Ast.Literal(
          new Ast.CompoundLiteral(
            "Person",
            new Map<string, Ast.Expression>([
              ["x", new Ast.Literal(10)],
              ["y", new Ast.Literal(20)],
              ["z", new Ast.Literal(30)],
            ])
          )
        )
      )
    );
    const test_block = new Ast.Block(test_stmts);

    expect(ast.toString()).toBe(test_block.toString());
  });

  test("Conditional expressions", () => {
    const test_string = `
      var a = if (1) then (2) else (3);
    `;
    const ast = parse(lex(test_string));

    const test_stmts = Array<Ast.Stmt>();
    test_stmts.push(
      new Ast.ConstDecl(
        "a",
        new Ast.ConditionalExpr(
          new Ast.Literal(1), // pred
          new Ast.Literal(2), // cons
          new Ast.Literal(3) // alt
        )
      )
    );
    const test_block = new Ast.Block(test_stmts);

    expect(ast.toString()).toBe(test_block.toString());
  });

  test("Conditional expressions with CompoundLiterals", () => {
    const test_string = `
      var a = if (1) then (Person { x = 10; y = 20; z = 30; }) else (3);
    `;
    const ast = parse(lex(test_string));

    const test_stmts = Array<Ast.Stmt>();
    test_stmts.push(
      new Ast.ConstDecl(
        "a",
        new Ast.ConditionalExpr(
          new Ast.Literal(1), // pred
          new Ast.Literal(
            new Ast.CompoundLiteral(
              "Person",
              new Map<string, Ast.Expression>([
                ["x", new Ast.Literal(10)],
                ["y", new Ast.Literal(20)],
                ["z", new Ast.Literal(30)],
              ])
            )
          ),
          new Ast.Literal(3) // alt
        )
      )
    );
    const test_block = new Ast.Block(test_stmts);

    expect(ast.toString()).toBe(test_block.toString());
  });

  test("Conditional expressions with CompoundLiterals without parenthesis", () => {
    const test_string = `
      var a = if 1 then Person { x = 10; y = 20; z = 30; } else 3;
    `;
    const ast = parse(lex(test_string));

    const test_stmts = Array<Ast.Stmt>();
    test_stmts.push(
      new Ast.ConstDecl(
        "a",
        new Ast.ConditionalExpr(
          new Ast.Literal(1), // pred
          new Ast.Literal(
            new Ast.CompoundLiteral(
              "Person",
              new Map<string, Ast.Expression>([
                ["x", new Ast.Literal(10)],
                ["y", new Ast.Literal(20)],
                ["z", new Ast.Literal(30)],
              ])
            )
          ),
          new Ast.Literal(3) // alt
        )
      )
    );
    const test_block = new Ast.Block(test_stmts);

    expect(ast.toString()).toBe(test_block.toString());
  });

  test("UserInput boolean", () => {
    const test_string = `
      var a = UserInput(boolean, "do_you_have_plan_a");
    `;

    const ast = parse(lex(test_string));

    const test_stmts = Array<Ast.Stmt>();
    test_stmts.push(
      new Ast.ConstDecl(
        "a",
        new Ast.Literal(
          new Ast.UserInputLiteral("boolean", "do_you_have_plan_a")
        )
      )
    );
    const test_block = new Ast.Block(test_stmts);

    expect(ast.toString()).toBe(test_block.toString());
  });

  test("UserInput number", () => {
    const test_string = `
      var a = UserInput(number , "how_much_do_you_owe_me");
    `;

    const ast = parse(lex(test_string));

    const test_stmts = Array<Ast.Stmt>();
    test_stmts.push(
      new Ast.ConstDecl(
        "a",
        new Ast.Literal(
          new Ast.UserInputLiteral("number", "how_much_do_you_owe_me")
        )
      )
    );
    const test_block = new Ast.Block(test_stmts);

    expect(ast.toString()).toBe(test_block.toString());
  });

  // Example found by Jules
  test("Not having spaces should not break lexing or parsing", () => {
    const test_string = ` 
      var n = 2; 
      { 
        n-1 
      } 
    `;

    const ast = parse(lex(test_string));

    const test_stmts = Array<Ast.Stmt>();
    test_stmts.push(new Ast.ConstDecl("n", new Ast.Literal(2)));
    const test_block_stmts = Array<Ast.Stmt>();
    test_block_stmts.push(
      new Ast.ExpressionStmt(
        new Ast.BinaryOp("-", new Ast.Name("n"), new Ast.Literal(1))
      )
    );
    test_stmts.push(new Ast.Block(test_block_stmts));
    const test_block = new Ast.Block(test_stmts);

    expect(ast.toString()).toBe(test_block.toString());
  });
});
