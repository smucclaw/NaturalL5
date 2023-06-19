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
      // console.error("match() out of bounds");
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
      case TokenType.LT:
        return "<";
      case TokenType.LT_EQ:
        return "<=";
      case TokenType.GT:
        return ">";
      case TokenType.GT_EQ:
        return ">=";
      case TokenType.DOUBLE_EQUAL:
        return "==";
      case TokenType.NOT_EQ:
        return "!=";
    }

    console.error("convert_token_to_binary_op got unusable token");
    throw new Error("convert_token_to_binary_op got unusable token");
  }

  convert_token_to_unary_op(token: Token): Ast.UnaryOpType | undefined {
    switch (token.token_type) {
      case TokenType.NOT:
        return "!";
      case TokenType.MINUS:
        return "-";
    }
    console.error("convert_token_to_unary_op got unusable token");
    throw new Error("convert_token_to_unary_op got unusable token");
  }

  convert_token_to_logical_op(
    token: Token
  ): Ast.LogicalCompositionType | undefined {
    switch (token.token_type) {
      case TokenType.AND:
        return "&&";
      case TokenType.OR:
        return "||";
    }
    console.error("convert_token_to_logical_op got unusable token");
    throw new Error("convert_token_to_logical_op got unusable token");
  }

  // Statements
  // { Block, ConstDecl, ExpressionStmt }
  // Note to just ignore Sequential as that's top level
  statement(): Ast.Stmt {
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

    // If not any of the above statements
    // Then it is an expression (wrapped in a statement)
    return this.expression_statement();
  }

  var(): Ast.ConstDecl {
    if (this.match(TokenType.IDENTIFIER)) {
      const name = this.previous_token() as Token;
      if (this.match(TokenType.EQUAL)) {
        const expr: Ast.Expression = this.expression();
        this.consume(TokenType.SEMICOLON, "Expect ';'");
        return new Ast.ConstDecl(name.literal, expr);
      }
    }

    console.error("var died");
    throw new Error("var died");
    // return new Ast.ConstDecl("varplaceholder", new Ast.Literal(1));
  }

  block(): Ast.Block {
    // const sequential_block = this.sequential();
    const statements: Array<Ast.Stmt> = [];
    while (this.current_token()?.token_type != TokenType.RIGHT_BRACE) {
      statements.push(this.statement());
    }

    this.consume(
      TokenType.RIGHT_BRACE,
      "Every block must end with a right brace"
    );
    return new Ast.Block(statements);
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

  expression_statement(): Ast.ExpressionStmt {
    // const expr = this.expression();
    // this.consume(TokenType.SEMICOLON, "Expect ';'");
    // return new Ast.ExpressionStmt(expr);
    return new Ast.ExpressionStmt(this.expression());
  }

  // Expressions
  // { Literal, Name, Call, LogicalComposition, BinaryOp,
  //   UnaryOp, ConditionalExpr, AttributeAccess }
  expression(): Ast.Expression {
    return this.conditional();
  }

  // binary(): Ast.Expression {
  //   if (this.match(TokenType.LEFT_PAREN)) {
  //     const expr = this.expression();
  //     this.consume(TokenType.RIGHT_PAREN, "Expected right paren ')'");
  //     return expr;
  //   }

  //   // Dont return addition() as cannot be a binary expression anymore
  //   // As all binary expressions are forced to have parenthesis
  //   return this.primary();
  // }

  // conditionals in this language are expressions
  // if (condition_expr) then {expr} else {expr}
  // if (pred)           then {cons} else {alt}
  // TODO : Clean up / determine the syntax
  // this syntax just felt easier to read by grouping the expressions
  // a parenthesis, but the parenthesis don't actually do anything here
  conditional(): Ast.Expression {
    if (this.match(TokenType.IF)) {
      this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'");
      const pred = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expect ')' after 'if' (pred");
      if (this.match(TokenType.THEN)) {
        this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'then'");
        const cons = this.expression();
        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after 'then'(cons");
        if (this.match(TokenType.ELSE)) {
          this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'else'");
          const alt = this.expression();
          this.consume(TokenType.RIGHT_PAREN, "Expect '(' after 'else'(alt");
          return new Ast.ConditionalExpr(pred, cons, alt);
        }
      }
    }

    return this.compound_literal();
  }

  compound_literal(): Ast.Expression {
    const expr = this.and_or();

    const token = this.previous_token();
    if (token?.token_type == TokenType.IDENTIFIER) {
      // Person {
      if (this.match(TokenType.LEFT_BRACE)) {
        // While its not }, match for all "attributes"
        // within the compound literal
        const properties = new Map<string, Ast.Expression>();
        while (!this.match(TokenType.RIGHT_BRACE)) {
          if (this.match(TokenType.IDENTIFIER)) {
            const property_identifier = this.previous_token() as Token;
            if (this.match(TokenType.EQUAL)) {
              const property_expression = this.expression();
              properties.set(property_identifier.literal, property_expression);
              this.match(TokenType.SEMICOLON);
            }
          }
        }
        return new Ast.Literal(
          new Ast.CompoundLiteral(token.literal, properties)
        );
      }
    }

    return expr;
  }

  and_or(): Ast.Expression {
    const expr = this.comparison();

    if (this.match(TokenType.AND) || this.match(TokenType.OR)) {
      const op = this.previous_token();
      const right = this.comparison();
      const ast_op: Ast.LogicalCompositionType =
        this.convert_token_to_logical_op(op!) as Ast.LogicalCompositionType;
      return new Ast.LogicalComposition(ast_op, expr, right);
    }

    return expr;
  }

  comparison(): Ast.Expression {
    const expr = this.addition();

    if (
      this.match(TokenType.LT) ||
      this.match(TokenType.LT_EQ) ||
      this.match(TokenType.GT) ||
      this.match(TokenType.GT_EQ) ||
      this.match(TokenType.DOUBLE_EQUAL) ||
      this.match(TokenType.NOT_EQ)
    ) {
      const op = this.previous_token();
      const right = this.addition();
      const ast_op: Ast.BinaryOpType = this.convert_token_to_binary_op(
        op!
      ) as Ast.BinaryOpType;
      return new Ast.BinaryOp(ast_op, expr, right);
    }

    return expr;
  }

  addition(): Ast.Expression {
    const expr = this.multiplication();

    // By precedence, these are on the same level
    if (this.match(TokenType.PLUS) || this.match(TokenType.MINUS)) {
      const op = this.previous_token();
      const right = this.multiplication();
      const ast_op: Ast.BinaryOpType = this.convert_token_to_binary_op(
        op!
      ) as Ast.BinaryOpType;
      return new Ast.BinaryOp(ast_op, expr, right);
    }

    return expr;
  }

  multiplication(): Ast.Expression {
    const expr = this.unary();

    if (this.match(TokenType.STAR)) {
      const op = this.previous_token();
      const right = this.unary();
      const ast_op: Ast.BinaryOpType = this.convert_token_to_binary_op(
        op!
      ) as Ast.BinaryOpType;
      return new Ast.BinaryOp(ast_op, expr, right);
    }

    return expr;
  }

  unary(): Ast.Expression {
    if (this.match(TokenType.NOT) || this.match(TokenType.MINUS)) {
      const op = this.previous_token();
      const right = this.unary();
      const ast_op: Ast.UnaryOpType = this.convert_token_to_unary_op(
        op!
      ) as Ast.UnaryOpType;
      return new Ast.UnaryOp(ast_op, right);
    }
    return this.call();
  }

  call(): Ast.Expression {
    // Calling a UserInput function
    if (this.match(TokenType.USERINPUT)) {
      this.consume(TokenType.LEFT_PAREN, "Expects '(' after UserInput");
      let user_input_callback_type: "number" | "boolean";
      if (this.match(TokenType.NUMBER)) {
        user_input_callback_type = "number";
      } else if (this.match(TokenType.BOOL)) {
        user_input_callback_type = "boolean";
      } else {
        throw new Error("UserInput type can only be (number | boolean)");
      }

      this.consume(
        TokenType.COMMA,
        "Expect ',' after UserInput(number|boolean"
      );

      if (this.match(TokenType.STRING)) {
        const token = this.previous_token();
        return new Ast.Literal(
          new Ast.UserInputLiteral(user_input_callback_type, token?.literal);
        );
      }
    }

    let expr = this.primary();

    while (this.current < this.tokens.length) {
      // Call Expressions
      if (this.match(TokenType.LEFT_PAREN)) {
        // If this is an empty function
        if (this.match(TokenType.RIGHT_PAREN)) {
          expr = new Ast.Call(expr, []);
        }
        // If this is not an empty function
        const parameters: Array<Ast.Expression> = [];
        while (!this.match(TokenType.RIGHT_PAREN)) {
          parameters.push(this.expression());
          this.match(TokenType.COMMA);
        }

        return new Ast.Call(expr, parameters);
      } else if (this.match(TokenType.DOT)) {
        if (this.match(TokenType.IDENTIFIER)) {
          const token = this.previous_token() as Token;
          expr = new Ast.AttributeAccess(expr, token.literal);
        }
      } else {
        break;
      }
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

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr: Ast.Expression = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expected a ) after a (");
      return expr;
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
  const statements: Array<Ast.Stmt> = [];
  while (parser.current != parser.tokens.length) {
    statements.push(parser.statement());
  }
  return new Ast.Block(statements);
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

`
if (condition)
then {expr}
else {expr}
`;
