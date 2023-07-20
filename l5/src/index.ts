import { ErrorContext, L5Error } from "./errors";
import { lex } from "./lexer";
import { Token } from "./token";
import { readFileSync } from "fs";
import { parse } from "./parser";

const test = readFileSync("./examples/uwu.l5", "utf8");
console.log(test);

const errctx = new ErrorContext(test);

try {
  const tokens: Token[] = lex(test, errctx);
  console.dir(tokens, { depth: null });

  const ast = parse(tokens, errctx);
  console.dir(ast, { depth: null });
} catch (error) {
  if (error instanceof L5Error) {
    console.error(error.message);
  } else throw error;
}
