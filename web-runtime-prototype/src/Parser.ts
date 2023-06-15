import * as Ast from "./AstNode";
import { Token, TokenType } from "./Token";

class Parser {
  current: number;
  tokens: Array<Token>;

  constructor(tokens: Array<Token>) {
    this.current = 0;
    this.tokens = tokens;
  }

  current_token(): Token | undefined {
    return this.tokens[this.current];
  }

  previous_token(): Token | undefined {
    return this.tokens[this.current - 1];
  }

  move() {
    this.current++;
  }

  match(token_type: TokenType): boolean {
    if (this.current < 0 || this.current >= this.tokens.length) {
      console.error("match() out of bounds");
      return false;
    }

    const token: Token = this.current_token() as Token;
    if (token.token_type == token_type) {
      this.current++;
      return true;
    }
    return false;
  }

  consume(token_type: TokenType, error: string) {
    const try_to_match = this.match(token_type);
    if (!try_to_match) {
      console.error(error);
      throw new Error("consume");
    }
  }

  convert_token_to_binary_op(token: Token): Ast.BinaryOpType | undefined {
    switch (token.token_type) {
      case TokenType.PLUS:
        return "+";
      case TokenType.MINUS:
        return "-";
      case TokenType.STAR:
        return "*";
    }

    console.error("Cannot convert to binary op");
    return undefined;
  }

  // Statements
  // { Block, ConstDecl, ExpressionStmt }
  // Note to just ignore Sequential as that's top level
  statement(): Ast.AstNode {
    // Match for var a = 10;
    if (this.match(TokenType.VAR)) {
      return this.var();
    }

    // Match for blocks
    if (this.match(TokenType.LEFT_BRACE)) {
      return this.block();
    }

    // Match for function a();
    if (this.match(TokenType.FUNCTION)) {
      return this.function();
    }

    return this.expression();
  }

  var(): Ast.AstNode {
    if (this.match(TokenType.IDENTIFIER)) {
      const name = this.previous_token() as Token;
      if (this.match(TokenType.EQUAL)) {
        const expr: Ast.Expression = this.expression();
        return new Ast.ConstDecl(name.literal, expr);
      }
    }

    console.error("var died");
    throw new Error("var died");
    // return new Ast.ConstDecl("varplaceholder", new Ast.Literal(1));
  }

  block(): Ast.Block {
    console.log("block() getting called");
    // const sequential_block = this.sequential();
    const statements: Array<Ast.AstNode> = [];
    while (this.current_token()?.token_type != TokenType.RIGHT_BRACE) {
      statements.push(this.statement());
    }

    this.consume(
      TokenType.RIGHT_BRACE,
      "Every block must end with a right brace"
    );
    return new Ast.Block(new Ast.Sequential(statements));
  }

  // function a(a, b, c) { ["a", "b", "c"]
  // }
  function(): Ast.ConstDecl {
    if (this.match(TokenType.IDENTIFIER)) {
      const function_name = this.previous_token() as Token;

      if (this.match(TokenType.LEFT_PAREN)) {
        const parameters: Array<string> = [];
        // Empty parameter
        if (this.match(TokenType.RIGHT_PAREN)) {
          if (this.match(TokenType.LEFT_BRACE)) {
            console.log("calling block from no parameters");
            const function_block = this.block();
            return new Ast.ConstDecl(
              function_name.literal,
              new Ast.Literal(
                new Ast.FunctionLiteral(parameters, function_block)
              )
            );
          }
        } else {
          // match all the parameters
          // Note : this will be a string and only here
          while (!this.match(TokenType.RIGHT_PAREN)) {
            if (this.match(TokenType.IDENTIFIER)) {
              const previous_token = this.previous_token() as Token;
              parameters.push(previous_token.literal);
            }
            this.match(TokenType.COMMA);
          }
          if (this.match(TokenType.LEFT_BRACE)) {
            const function_block = this.block();
            return new Ast.ConstDecl(
              function_name.literal,
              new Ast.Literal(
                new Ast.FunctionLiteral(parameters, function_block)
              )
            );
          }
        }
      }
      throw new Error("Function need to have a '('");
    }

    throw new Error("function LAKSJDLAKSJD");
  }

  // Expressions
  // { Literal, Name, Call, LogicalComposition, BinaryOp,
  //   UnaryOp, ConditionalExpr, AttributeAccess }
  expression(): Ast.Expression {
    return this.binary();
  }

  binary(): Ast.Expression {
    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.addition();
      this.consume(TokenType.RIGHT_PAREN, "Expected right paren ')'");
      return expr;
    }

    // Dont return addition() as cannot be a binary expression anymore
    // As all binary expressions are forced to have parenthesis
    return this.primary();
  }

  addition(): Ast.Expression {
    const expr = this.primary();

    // By precedence, these are on the same level
    if (this.match(TokenType.PLUS) || this.match(TokenType.MINUS)) {
      const op = this.previous_token() as Token;
      const right = this.addition();

      const ast_op: Ast.BinaryOpType = this.convert_token_to_binary_op(
        op
      ) as Ast.BinaryOpType;
      return new Ast.BinaryOp(ast_op, expr, right);
    }

    return expr;
  }

  primary(): Ast.Expression {
    if (this.match(TokenType.NUMBER)) {
      // Read number
      const token: Token = this.previous_token() as Token;
      const n: number = parseInt(token.literal);
      return new Ast.Literal(n);
    }

    if (this.match(TokenType.STRING)) {
      const token: Token = this.previous_token() as Token;
      return new Ast.Name(token.literal);
    }

    if (this.match(TokenType.IDENTIFIER)) {
      const token: Token = this.previous_token() as Token;
      return new Ast.Name(token.literal);
    }

    // TODO: by default die, or a null value in the future
    // die
    console.error(this.current_token());
    console.error("die @ primary");
    throw new Error("die");
  }
}

function parse(tokens: Array<Token>): Ast.Block {
  const parser = new Parser(tokens);
  const statements: Array<Ast.AstNode> = [];
  while (parser.current != parser.tokens.length) {
    statements.push(parser.statement());
  }
  return new Ast.Block(new Ast.Sequential(statements));

  // return new Ast.Block(parser.sequential());
}

export { parse };

`
var a = 10 ;
var b = 20;

a + b;
`;

`
Sequential { Stmt - ConstDecl(), Stmt - ConstDecl(), Expr - BinaryOp() }
`;

`
10 + 2
10 + x

BinaryOp("+", Ast.Literal(10), Ast.Literal(2))
BinaryOp("+", Ast.Literal(10), Ast.Name(x))
`;

`
function a() {
  var a = 10;
  var b = 20;
  var c = a + b;
  return c;
}

ConstDecl(Ast.Name("a"), expr)
expr == Ast.Literal(Ast.Node(Ast.Block(Ast.Sequential([...]))))
`;

`
TODO : test for lazyness, this ((10+20) > 50) should not be evaluated as 
true should just "end" it
(true || ((10 + 20) > 50))
`;

`
var a = Test {
  x = 10;
  y = 20;
};

ConstDecl(
  literal: CompoundLiteral("Test", Map<string, Ast.AstNode> { ["x", Number(10)..]})
  )
`;
