import * as Ast from "./AstNode";
import { Token, TokenType } from "./Token";
import { Maybe } from "./utils";

function contextual(
  func: () => Maybe<Ast.AstNode>,
  parser: Parser
): Maybe<Ast.AstNode> {
  const wrapper = (parser: Parser): Maybe<Ast.AstNode> => {
    // Gets the starting position
    const start_position = parser.current;
    // Try to run the function
    const res = func() as Maybe<Ast.AstNode>;
    // If the function parses nothing, set the position back to
    // where it originally started
    if (res == undefined) {
      console.log(
        "backtracking at line: ",
        parser.current_token()?.line + " column: " + start_position
      );
      parser.set_position(start_position);
      // Signals that it has done badly
      return undefined;
    }
    // If the function parses well, update the end column
    // const end_position = parser.current;
    return res;
  };

  // Returnt he result of the wrapped function
  return wrapper(parser);
}

class Parser {
  current: number;
  tokens: Array<Token>;

  constructor(tokens: Array<Token>) {
    this.current = 0;
    this.tokens = tokens;

    this.statement = this.statement.bind(this);
    this.var = this.var.bind(this);
    this.block = this.block.bind(this);
    this.function = this.function.bind(this);
    this.expression_statement = this.expression_statement.bind(this);
    this.expression = this.expression.bind(this);
    this.conditional = this.conditional.bind(this);
    this.compound_literal = this.compound_literal.bind(this);
    this.and_or = this.and_or.bind(this);
    this.comparison = this.comparison.bind(this);
    this.multiplication = this.multiplication.bind(this);
    this.addition = this.addition.bind(this);
    this.unary = this.unary.bind(this);
    this.call = this.call.bind(this);
    this.primitive = this.primitive.bind(this);
  }

  set_position(position: number) {
    this.current = position;
  }

  current_token(): Maybe<Token> {
    return this.tokens[this.current];
  }

  previous_token(): Maybe<Token> {
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

    const token = this.current_token();
    if (token == undefined) return false;
    if (token.token_type == token_type) {
      this.current++;
      return true;
    }
    return false;
  }

  match_multi(token_types: Array<TokenType>): boolean {
    if (this.current < 0 || this.current >= this.tokens.length) {
      return false;
    }

    const current_token = this.current_token();
    if (current_token == undefined) return false;
    for (const token_type of token_types) {
      if (token_type == current_token.token_type) {
        this.current++;
        return true;
      }
    }

    return false;
  }

  consume(token_type: TokenType, error: string) {
    const try_to_match = this.match(token_type);
    if (!try_to_match) {
      console.error(error);
      throw new Error(
        "expected " + token_type + " got: " + this.current_token()?.literal
      );
    }
  }

  convert_token_to_binary_op(token: Token): Maybe<Ast.BinaryOpType> {
    switch (token.token_type) {
      case TokenType.PLUS:
        return "+";
      case TokenType.MINUS:
        return "-";
      case TokenType.STAR:
        return "*";
      case TokenType.PERCENT:
        return "%";
      case TokenType.SLASH:
        return "/";
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

    return undefined;
  }

  convert_token_to_unary_op(token: Token): Maybe<Ast.UnaryOpType> {
    switch (token.token_type) {
      case TokenType.NOT:
        return "!";
      case TokenType.MINUS:
        return "-";
    }
    return undefined;
    // console.error("convert_token_to_unary_op got unusable token");
    // throw new Error(
    //   "convert_token_to_unary_op got unusable token: " + token.token_type
    // );
  }

  convert_token_to_logical_op(token: Token): Maybe<Ast.LogicalCompositionType> {
    switch (token.token_type) {
      case TokenType.AND:
        return "&&";
      case TokenType.OR:
        return "||";
    }
    return undefined;
    // console.error("convert_token_to_logical_op got unusable token");
    // throw new Error(
    //   "convert_token_to_logical_op got unusable token: " + token.token_type
    // );
  }

  statement(): Maybe<Ast.Stmt> {
    if (this.match(TokenType.VAR))
      return contextual(this.var, this) as Ast.Stmt;
    if (this.match(TokenType.LEFT_BRACE))
      return contextual(this.block, this) as Ast.Stmt;
    if (this.match(TokenType.FUNCTION))
      return contextual(this.function, this) as Ast.Stmt;

    return contextual(this.expression_statement, this) as Ast.Stmt;
  }

  var(): Maybe<Ast.ConstDecl | Ast.Stmt> {
    if (!this.match(TokenType.IDENTIFIER)) {
      // Need an identifier after var
      console.error("Need an identifier after var");
      return undefined;
    }

    const token = this.previous_token() as Token;
    if (!this.match(TokenType.EQUAL)) {
      // Need an equal after a var {identifier}
      console.error("Need an equal after a var {identifier}");
      return undefined;
    }

    const expr = contextual(this.expression, this) as Ast.Expression;
    if (!this.match(TokenType.SEMICOLON)) {
      // Expect a ';' at the end of a variable declaration
      console.error("Expect a ';' at the end of a variable declaration");
      return undefined;
    }

    return new Ast.ConstDecl(token, expr);
  }

  block(): Maybe<Ast.Block | Ast.Stmt> {
    const statements: Array<Ast.Stmt> = [];
    while (this.current_token()?.token_type != TokenType.RIGHT_BRACE) {
      const statement = contextual(this.statement, this) as Ast.Stmt;
      if (statement == undefined) break;
      statements.push(statement);
    }
    if (!this.match(TokenType.RIGHT_BRACE)) {
      console.error("After a block should have a '}'");
      return undefined;
    }
    return new Ast.Block(statements);
  }

  function(): Maybe<Ast.ConstDecl | Ast.Stmt> {
    if (!this.match(TokenType.IDENTIFIER)) {
      // an identifier must be provided for after a function
      console.error("an identifier must be provided for after a function");
      return undefined;
    }

    const token = this.previous_token() as Token;

    if (!this.match(TokenType.LEFT_PAREN)) {
      // a function must be followed by '('
      console.error("a function must be followed by '('");
      return undefined;
    }

    const parameters: Array<Token> = [];
    // Empty parameter
    if (this.match(TokenType.RIGHT_PAREN)) {
      if (!this.match(TokenType.LEFT_BRACE)) {
        // A function must have a body, opened with left brace
        console.error("A function must have a body, opened with left brace");
        return undefined;
      }
      const body = contextual(this.block, this) as Ast.Block;
      return new Ast.ConstDecl(
        token,
        new Ast.Literal(new Ast.FunctionLiteral(parameters, body))
      );
    } else {
      while (!this.match(TokenType.RIGHT_PAREN)) {
        if (!this.match(TokenType.IDENTIFIER)) {
          // Only identifiers are allowed in function parameters
          console.error("Only identifiers are allowed in function parameters");
          return undefined;
        }
        const parameter = this.previous_token() as Token;
        parameters.push(parameter);
        this.match(TokenType.COMMA);
      }
      if (!this.match(TokenType.LEFT_BRACE)) {
        // A function must have a body, opened with left brace
        console.error("A function must have a body, opened with left brace");
        return undefined;
      }
      const body = contextual(this.block, this) as Ast.Block;
      return new Ast.ConstDecl(
        token,
        new Ast.Literal(new Ast.FunctionLiteral(parameters, body))
      );
    }

    // Did not follow the format
    console.error("Did not follow the format for a function");
    return undefined;
  }

  expression_statement(): Maybe<Ast.ExpressionStmt> {
    return new Ast.ExpressionStmt(
      contextual(this.expression, this) as Ast.Expression
    );
  }

  expression(): Maybe<Ast.Expression> {
    return contextual(this.conditional, this) as Ast.Expression;
  }

  conditional(): Maybe<Ast.ConditionalExpr | Ast.Expression> {
    const expr = contextual(this.compound_literal, this) as Ast.Expression;

    // If it matches a ?, it's a ternary expression
    if (this.match(TokenType.QUESTION)) {
      const cons = contextual(this.expression, this) as Ast.Expression;
      if (!this.match(TokenType.COLON)) {
        console.error("After a ? <expr> a ':' is required");
        return undefined;
      }
      const alt = contextual(this.expression, this) as Ast.Expression;
      return new Ast.ConditionalExpr(expr, cons, alt);
    }

    return expr;
  }

  compound_literal(): Maybe<Ast.Literal | Ast.Expression> {
    const expr = contextual(this.and_or, this) as Ast.Expression;

    const token = this.previous_token() as Token;
    if (token.token_type == TokenType.IDENTIFIER) {
      if (this.match(TokenType.LEFT_BRACE)) {
        // While its not }, match for all "properties"
        const properties = new Map<Token, Ast.Expression>();
        while (!this.match(TokenType.RIGHT_BRACE)) {
          if (!this.match(TokenType.IDENTIFIER)) {
            // Must have an identifier in a brace
            console.error("Must have an identifier in a brace");
            return undefined;
          }
          const property_identifier = this.previous_token() as Token;
          if (!this.match(TokenType.EQUAL)) {
            // Must have an EQUAL after the property_identifier
            console.error("Must have an EQUAL after the property_identifier");
            return undefined;
          }
          const property_expression = contextual(
            this.expression,
            this
          ) as Ast.Expression;
          this.consume(
            TokenType.SEMICOLON,
            "Expected ';' after declaring an isntance for compound literal"
          );
          properties.set(property_identifier, property_expression);
        }
        const temp_prop = new Map();
        properties.forEach((e, k) => temp_prop.set(k.literal, e));
        return new Ast.Literal(
          new Ast.CompoundLiteral(token.literal, temp_prop)
        );
      }
    }

    return expr;
  }

  and_or(): Maybe<Ast.LogicalComposition | Ast.Expression> {
    const left_expr = contextual(this.comparison, this) as Ast.Expression;

    if (this.match_multi([TokenType.AND, TokenType.OR])) {
      const token = this.previous_token();
      if (token == undefined) return undefined;
      const logical_op = this.convert_token_to_logical_op(token);
      if (logical_op == undefined) return undefined;
      const right_expr = contextual(this.comparison, this) as Ast.Expression;
      if (right_expr == undefined) return undefined;

      return new Ast.LogicalComposition(logical_op, left_expr, right_expr, token);
    }

    return left_expr;
  }

  comparison(): Maybe<Ast.BinaryOp | Ast.Expression> {
    const left_expr = contextual(this.multiplication, this) as Ast.Expression;

    if (
      this.match_multi([
        TokenType.LT,
        TokenType.LT_EQ,
        TokenType.GT,
        TokenType.GT_EQ,
        TokenType.DOUBLE_EQUAL,
        TokenType.NOT_EQ,
      ])
    ) {
      const token = this.previous_token();
      if (token == undefined) return undefined;
      const binary_op = this.convert_token_to_binary_op(token);
      if (binary_op == undefined) return undefined;
      const right_expr = contextual(this.comparison, this) as Ast.Expression;
      if (right_expr == undefined) return undefined;

      return new Ast.BinaryOp(binary_op, left_expr, right_expr, token);
    }
    return left_expr;
  }

  multiplication(): Maybe<Ast.BinaryOp | Ast.Expression> {
    const left_expr = contextual(this.addition, this) as Ast.Expression;

    if (
      this.match_multi([TokenType.STAR, TokenType.SLASH, TokenType.PERCENT])
    ) {
      const token = this.previous_token();
      if (token == undefined) return undefined;
      const binary_op = this.convert_token_to_binary_op(token);
      if (binary_op == undefined) return undefined;
      const right_expr = contextual(
        this.multiplication,
        this
      ) as Ast.Expression;
      if (right_expr == undefined) return undefined;

      return new Ast.BinaryOp(binary_op, left_expr, right_expr, token);
    }

    return left_expr;
  }

  addition(): Maybe<Ast.BinaryOp | Ast.Expression> {
    const left_expr = contextual(this.unary, this) as Ast.Expression;

    if (this.match_multi([TokenType.PLUS, TokenType.MINUS])) {
      const token = this.previous_token();
      if (token == undefined) return undefined;
      const binary_op = this.convert_token_to_binary_op(token);
      if (binary_op == undefined) return undefined;
      const right_expr = contextual(this.addition, this) as Ast.Expression;
      if (right_expr == undefined) return undefined;

      return new Ast.BinaryOp(binary_op, left_expr, right_expr, token);
    }

    return left_expr;
  }

  unary(): Maybe<Ast.UnaryOp | Ast.Expression> {
    if (this.match_multi([TokenType.NOT, TokenType.MINUS])) {
      const token = this.previous_token();
      if (token == undefined) return undefined;
      const unary_op = this.convert_token_to_unary_op(token);
      if (unary_op == undefined) return undefined;
      const right_expr = contextual(this.unary, this) as Ast.Expression;
      if (right_expr == undefined) return undefined;

      return new Ast.UnaryOp(unary_op, right_expr, token);
    }

    return contextual(this.call, this) as Ast.Expression;
  }

  call(): Maybe<Ast.Literal | Ast.Call | Ast.Expression> {
    // Match for a UserInput
    if (this.match(TokenType.USERINPUT)) {
      // Needs to have a '(' immediately after
      this.consume(TokenType.LEFT_PAREN, "Expects '(' after UserInput");

      // can only accept "number" | "bool"
      let user_input_callback_type: "number" | "boolean";
      if (this.match(TokenType.NUMBER)) {
        user_input_callback_type = "number";
      } else if (this.match(TokenType.BOOL)) {
        user_input_callback_type = "boolean";
      } else {
        return undefined;
      }

      // Needs a comma after
      this.consume(
        TokenType.COMMA,
        "Expect ',' after UserInput(number|boolean"
      );

      if (!this.match(TokenType.STRING)) {
        return undefined;
      }

      const token = this.previous_token() as Token;
      this.consume(TokenType.RIGHT_PAREN, "Expect ')' after UserInput(...");
      return new Ast.Literal(
        new Ast.UserInputLiteral(user_input_callback_type, token.literal, token)
      );
    }

    let expr = contextual(this.primitive, this) as Ast.Expression;

    // Call or dot expressions
    while (this.current < this.tokens.length) {
      if (this.match(TokenType.LEFT_PAREN)) {
        if (this.match(TokenType.RIGHT_PAREN)) {
          return new Ast.Call(expr, []);
        }

        const parameters: Array<Ast.Expression> = [];
        while (!this.match(TokenType.RIGHT_PAREN)) {
          parameters.push(contextual(this.expression, this) as Ast.Expression);
          this.match(TokenType.COMMA);
        }

        return new Ast.Call(expr, parameters);
      } else if (this.match(TokenType.DOT)) {
        if (this.match(TokenType.IDENTIFIER)) {
          const token = this.previous_token() as Token;
          expr = new Ast.AttributeAccess(expr, token);
        }
      } else {
        // Break, not return, as this is intended
        break;
      }
    }

    return expr;
  }

  primitive(): Maybe<Ast.Expression> {
    if (this.match(TokenType.NUMBER)) {
      const token = this.previous_token();
      if (token == undefined) return undefined;
      return new Ast.Literal(parseInt(token.literal));
    }

    if (this.match(TokenType.STRING)) {
      const token = this.previous_token();
      if (token == undefined) return undefined;
      return new Ast.Name(token);
    }

    if (this.match(TokenType.IDENTIFIER)) {
      const token = this.previous_token();
      if (token == undefined) return undefined;
      return new Ast.Name(token);
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = contextual(this.expression, this) as Ast.Expression;
      this.consume(TokenType.RIGHT_PAREN, "Expected a ')' after a '('");
      return expr;
    }

    // TODO : Replace with proper error handling
    console.error(
      "This token is not supported within the language: " +
        this.current_token()?.literal
    );
    throw new Error(
      "This token is not supported within the language: " +
        this.current_token()?.token_type
    );

    return undefined;
  }

  program(): Ast.Block {
    const statements: Array<Ast.Stmt> = [];
    while (this.current != this.tokens.length) {
      const statement = contextual(this.statement, this) as Ast.Stmt;
      if (statement == undefined) break;
      statements.push(statement);
    }
    return new Ast.Block(statements);
  }
}

export function parse(tokens: Array<Token>): Ast.Block {
  const parser = new Parser(tokens);
  return parser.program();
}
