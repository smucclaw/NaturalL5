import { describe, expect, test } from "@jest/globals";
import { lex, make_token, Context } from "../src/Lexer";
import { parse } from "../src/Parser";
import { TokenType } from "../src/Token";
import * as Ast from "../src/AstNode";

const ctx: Context = {
  line: 1,
  begin_col: 1,
  end_col: 1,
};

describe("Parser", () => {
  test("Variable declarations", () => {
    const test_string = `
      \`a\` = 10;
      \`b\` = 20;
    `;
    const ast = parse(lex(test_string));

    const test_stmts = Array<Ast.Stmt>();
    test_stmts.push(
      new Ast.ConstDecl(
        make_token(TokenType.IDENTIFIER, "a", ctx),
        new Ast.Literal(10)
      )
    );
    test_stmts.push(
      new Ast.ConstDecl(
        make_token(TokenType.IDENTIFIER, "b", ctx),
        new Ast.Literal(20)
      )
    );
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
        make_token(TokenType.IDENTIFIER, "f", ctx),
        new Ast.Literal(
          new Ast.FunctionLiteral(
            [
              make_token(TokenType.IDENTIFIER, "x", ctx),
              make_token(TokenType.IDENTIFIER, "y", ctx),
              make_token(TokenType.IDENTIFIER, "z", ctx),
            ],
            new Ast.Block([
              new Ast.ExpressionStmt(
                new Ast.BinaryOp(
                  "+",
                  new Ast.BinaryOp(
                    "+",
                    new Ast.Name(make_token(TokenType.IDENTIFIER, "x", ctx)),
                    new Ast.Name(make_token(TokenType.IDENTIFIER, "y", ctx)),
                    make_token(TokenType.PLUS, "+", ctx)
                  ),
                  new Ast.Name(make_token(TokenType.IDENTIFIER, "z", ctx)),
                  make_token(TokenType.PLUS, "+", ctx)
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

  // Example found by Jules
  test("Function usage", () => {
    const test_string = `
      function f(x) {
       (x <= 0) ? (100) : (f(x-1))
      }

      f(1)
    `;
    const ast = parse(lex(test_string));

    const test_stmts = Array<Ast.Stmt>();
    test_stmts.push(
      new Ast.ConstDecl(
        make_token(TokenType.IDENTIFIER, "f", ctx),
        new Ast.Literal(
          new Ast.FunctionLiteral(
            [make_token(TokenType.IDENTIFIER, "x", ctx)],
            new Ast.Block([
              new Ast.ExpressionStmt(
                new Ast.ConditionalExpr(
                  new Ast.BinaryOp(
                    "<=",
                    new Ast.Name(make_token(TokenType.IDENTIFIER, "x", ctx)),
                    new Ast.Literal(0),
                    make_token(TokenType.LT_EQ, "<=", ctx)
                  ),
                  new Ast.Literal(100),
                  new Ast.Call(
                    new Ast.Name(make_token(TokenType.IDENTIFIER, "f", ctx)),
                    [
                      new Ast.BinaryOp(
                        "-",
                        new Ast.Name(
                          make_token(TokenType.IDENTIFIER, "x", ctx)
                        ),
                        new Ast.Literal(1),
                        make_token(TokenType.MINUS, "-", ctx)
                      ),
                    ]
                  )
                )
              ),
            ])
          )
        )
      )
    );
    test_stmts.push(
      new Ast.ExpressionStmt(
        new Ast.Call(new Ast.Name(make_token(TokenType.IDENTIFIER, "f", ctx)), [
          new Ast.Literal(1),
        ])
      )
    );
    const test_block = new Ast.Block(test_stmts);

    expect(ast.toString()).toBe(test_block.toString());
  });

  // A bug found that you could
  test("Logical comparison with calls", () => {
    const test_string = `
      \`a\` = (x <= 10 && b()) ? 20 : 30;
    `;
    const ast = parse(lex(test_string));

    const test_stmts = Array<Ast.Stmt>();
    test_stmts.push(
      new Ast.ConstDecl(
        make_token(TokenType.IDENTIFIER, "a", ctx),
        new Ast.ConditionalExpr(
          new Ast.LogicalComposition(
            "&&",
            new Ast.BinaryOp(
              "<=",
              new Ast.Name(make_token(TokenType.IDENTIFIER, "x", ctx)),
              new Ast.Literal(10),
              make_token(TokenType.LT_EQ, "<=", ctx)
            ),
            new Ast.Call(
              new Ast.Name(make_token(TokenType.IDENTIFIER, "b", ctx)),
              []
            ),
            make_token(TokenType.AND, "&&", ctx)
          ),
          new Ast.Literal(20),
          new Ast.Literal(30)
        )
      )
    );
    const test_block = new Ast.Block(test_stmts);

    expect(ast.toString()).toBe(test_block.toString());
  });

  test("CompoundLiteral instances", () => {
    const test_string = `
      \`person\` = Person {
        x = 10;
        y = 20;
        z = 30;
      };
    `;
    const ast = parse(lex(test_string));

    const test_stmts = Array<Ast.Stmt>();
    test_stmts.push(
      new Ast.ConstDecl(
        make_token(TokenType.IDENTIFIER, "person", ctx),
        new Ast.Literal(
          new Ast.CompoundLiteral(
            make_token(TokenType.IDENTIFIER, "Person", ctx),
            new Map<string, Ast.Expression>([
              ["x", new Ast.Literal(10)],
              ["y", new Ast.Literal(20)],
              ["z", new Ast.Literal(30)],
            ]),
            [
              (make_token(TokenType.IDENTIFIER, "x", ctx),
              make_token(TokenType.IDENTIFIER, "y", ctx),
              make_token(TokenType.IDENTIFIER, "z", ctx)),
            ]
          )
        )
      )
    );
    const test_block = new Ast.Block(test_stmts);

    expect(ast.toString()).toBe(test_block.toString());
  });

  test("Comments", () => {
    const test_string = `
      \`a\` = 20;
      // this should not do anything
      // this too should not do anything
      // var a = 10;
      // even if it has a valid syntax as above
    `;
    const ast = parse(lex(test_string));

    const test_stmts = Array<Ast.Stmt>();
    test_stmts.push(
      new Ast.ConstDecl(
        make_token(TokenType.IDENTIFIER, "a", ctx),
        new Ast.Literal(20)
      )
    );
    const test_block = new Ast.Block(test_stmts);

    expect(ast.toString()).toBe(test_block.toString());
  });

  test("Conditional expressions with ternary operators with CompoundLiterals", () => {
    const test_string = `
      \`a\` = 1 ? Person { x = 10; y = 20; z = 30; } : 3;
    `;
    const ast = parse(lex(test_string));

    const test_stmts = Array<Ast.Stmt>();
    test_stmts.push(
      new Ast.ConstDecl(
        make_token(TokenType.IDENTIFIER, "a", ctx),
        new Ast.ConditionalExpr(
          new Ast.Literal(1), // pred
          new Ast.Literal(
            new Ast.CompoundLiteral(
              make_token(TokenType.IDENTIFIER, "Person", ctx),
              new Map<string, Ast.Expression>([
                ["x", new Ast.Literal(10)],
                ["y", new Ast.Literal(20)],
                ["z", new Ast.Literal(30)],
              ]),
              [
                (make_token(TokenType.IDENTIFIER, "x", ctx),
                make_token(TokenType.IDENTIFIER, "y", ctx),
                make_token(TokenType.IDENTIFIER, "z", ctx)),
              ]
            )
          ),
          new Ast.Literal(3) // alt
        )
      )
    );
    const test_block = new Ast.Block(test_stmts);

    expect(ast.toString()).toBe(test_block.toString());
  });

  test("Nested conditional expressions", () => {
    const test_string = `
      \`a\` =  1 ? 10 
                  : 20 ? 30 
                  : 30 ? 40
                  : 50;
    `;
    const ast = parse(lex(test_string));

    const test_stmts = Array<Ast.Stmt>();
    test_stmts.push(
      new Ast.ConstDecl(
        make_token(TokenType.IDENTIFIER, "a", ctx),
        new Ast.ConditionalExpr(
          new Ast.Literal(1), // pred
          new Ast.Literal(10), // cons
          new Ast.ConditionalExpr( // alt
            new Ast.Literal(20), // pred
            new Ast.Literal(30), // cons
            new Ast.ConditionalExpr( // alt
              new Ast.Literal(30), // pred
              new Ast.Literal(40), // cons
              new Ast.Literal(50) // alt
            )
          )
        )
      )
    );
    const test_block = new Ast.Block(test_stmts);

    expect(ast.toString()).toBe(test_block.toString());
  });

  test("UserInput boolean", () => {
    const test_string = `
      \`a\` = UserInput(boolean, "do_you_have_plan_a");
    `;

    const ast = parse(lex(test_string));

    const test_stmts = Array<Ast.Stmt>();
    test_stmts.push(
      new Ast.ConstDecl(
        make_token(TokenType.IDENTIFIER, "a", ctx),
        new Ast.Literal(
          new Ast.UserInputLiteral(
            "boolean",
            "do_you_have_plan_a",
            make_token(TokenType.STRING, "do_you_have_plan_a", ctx)
          )
        )
      )
    );
    const test_block = new Ast.Block(test_stmts);

    expect(ast.toString()).toBe(test_block.toString());
  });

  test("UserInput number", () => {
    const test_string = `
      \`a\` = UserInput(number, "how_much_do_you_owe_me");
    `;

    const ast = parse(lex(test_string));

    const test_stmts = Array<Ast.Stmt>();
    test_stmts.push(
      new Ast.ConstDecl(
        make_token(TokenType.IDENTIFIER, "a", ctx),
        new Ast.Literal(
          new Ast.UserInputLiteral(
            "number",
            "how_much_do_you_owe_me",
            make_token(TokenType.STRING, "how_much_do_you_owe_me", ctx)
          )
        )
      )
    );
    const test_block = new Ast.Block(test_stmts);

    expect(ast.toString()).toBe(test_block.toString());
  });

  // Example found by Jules
  test("Not having spaces should not break lexing or parsing", () => {
    const test_string = ` 
      \`n\` = 2; 
      { 
        n-1 
      } 
    `;

    const ast = parse(lex(test_string));

    const test_stmts = Array<Ast.Stmt>();
    test_stmts.push(
      new Ast.ConstDecl(
        make_token(TokenType.IDENTIFIER, "n", ctx),
        new Ast.Literal(2)
      )
    );
    const test_block_stmts = Array<Ast.Stmt>();
    test_block_stmts.push(
      new Ast.ExpressionStmt(
        new Ast.BinaryOp(
          "-",
          new Ast.Name(make_token(TokenType.IDENTIFIER, "n", ctx)),
          new Ast.Literal(1),
          make_token(TokenType.MINUS, "-", ctx)
        )
      )
    );
    test_stmts.push(new Ast.Block(test_block_stmts));
    const test_block = new Ast.Block(test_stmts);

    expect(ast.toString()).toBe(test_block.toString());
  });

  test("Function annotations in blocks, with no templated variables", () => {
    const test_string = `
      {
        @ "Every block should be able to have a function annotation"
      }
    `;
    const ast = parse(lex(test_string));

    const block_stmts = (ast as Ast.Block).stmts;
    expect(block_stmts.length).toBe(1);
    expect(block_stmts.at(0)?.tag == "Block");

    const function_annotation_block = (block_stmts.at(0) as Ast.Block).stmts;
    expect(function_annotation_block.length).toBe(1);
    expect(function_annotation_block.at(0)?.tag == "FunctionAnnotation");

    const function_annotation = function_annotation_block.at(
      0
    ) as Ast.FunctionAnnotation;
    // The empty sanity string
    expect(function_annotation.annotations.length).toBe(1);
    // There are no templated parameters in this case
    expect(function_annotation.parameters.length).toBe(0);

    const function_annotation_src = function_annotation._op_src;
    expect(function_annotation_src.literal).toBe(
      "Every block should be able to have a function annotation"
    );
  });
});
