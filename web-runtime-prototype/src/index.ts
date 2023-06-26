// import { EvaluatorContext } from "./Evaluator";
import * as Ast from "./AstNode";
import { lex } from "./Lexer";
import { parse } from "./Parser";

const test = "";

const tokens = lex(test);
console.log(tokens);
const block: Ast.Block = parse(tokens);
console.dir(block, { depth: null });
