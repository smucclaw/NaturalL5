// import {
//   EventResult,
//   EventWaiting,
//   EventRequest,
//   EventValidate,
//   EventInvalidate,
// } from "./CallbackEvent";
// import { EvaluatorContext } from "./Evaluator";
import { lex } from "./Lexer";
import { parse } from "./Parser";
import * as Ast from "./AstNode";

let code: string;
code = "";
code = `
function uwu(x, y, z) {
  @"Applied uwu on {x}, {y} and {z}, returns {%}"
  x ? y + z : y - z
}
\`a\` = UserInput(boolean, "a");
\`b\` = UserInput(number, "b");
\`c\` = UserInput(number, "c");
uwu(a,b,c) * 100
`;

code = ` 
var a = UserInput(boolean, "a"); 
var b = UserInput(number, "b"); 
var c = UserInput(number, "c"); 
if a then b else c 
`;

code = ` 
var a = UserInput(boolean, "a"); 
var b = UserInput(number, "b"); 
var c = UserInput(number, "c"); 
if a then b else c 
`;
code = `
var \`x\` = 10;
{
var \`r\` = Result {
  a = x + 10;
  b = Result2 {
    x = 1;
    y = r.a;
  };
};
r
}
`;

code = `
  function f(x, y) {
    @ "hi there {x+1} + {y}"
    x + y
  }
`;

code = `
{
  @ "Every block should be able to have a {f} annotation"
}
`;

// answers.get("b")(10);
// answers.get("a")(true);
// answers.get("a")(false);
// answers.get("c")(20);

// answers.get("a")(true);
// answers.get("b")(10);
// answers.get("a")(false);
// answers.get("c")(20);

code = `
function f(x, y) {
  @ "This function returns {x} + {y} = {%}"
  x + y
}
`;

code = `
\`hi\` = 10;
\`uwu\` = 12093;
{
  hi + uwu
}
`;

code = `
function f(x, y) {
  @ "This function returns {x} + {y} = {%}"
  x + y
}
f(1, 2)
`;

code = `
function f() {
  @ "Hello there"
  1
}
f()
`;

code = `
function f(x, y) {
  @ "This function returns {x} + {y} = {%}"
  x + y
}
f(1, 2)
`;

code = `
  function f(x, y) {
    @ "hi there {x+1} + {y}"
    x + y
  }
  `;

code = `
{
  @ "Every block should be able to have a {f} annotation"
}
`;

code = `
var \`a\` = UserInput(boolean, "a");
var \`b\` = UserInput(boolean, "b");

var \`t\`  = Any(\`a\`, \`b\`);
var \`tt\` = All(\`a\`, \`b\`);
`;

code = `
var \`a\` = switch {
  case 1 == 1: { 1 }
  case 2: { 2 } 
  default: { 3 && 3 }
};
`;

code = `
  function f(x, y) {
    @ "hi there {x+1} + {y}"
    x + y
  }
  `;

code = `
var a = switch {
  case 1 == 1: { 1 }
  case 2: { 2 } 
  default: { 3 && 3 }
};
a
`;

// console.log(code);

const tokens = lex(code);
console.log(tokens);
// tokens.forEach((token: Token) => {
//   if (
//     token.annotated_expressions.length > 0 &&
//     token.token_type == TokenType.STRING
//   ) {
//     console.log("substrings: ", token.annotated_substrings);
//     console.log("strings: ", token.annotated_string);
//     console.log("exprs: ", token.annotated_expressions);
//   }
// });

const ast: Ast.Block = parse(tokens);
console.log("***");
console.dir(ast, { depth: null });
console.log("***");

// const ctx = EvaluatorContext.from_program(code, (x) => {
//   console.log();
//   console.log(">>>>>>>");
//   if (x instanceof EventResult) console.log("DONE     : ", `${x.result}`);
//   if (x instanceof EventWaiting)
//     console.log("WAITING  :", x.userinput.toString());
//   console.log(">>>>>>>");
//   console.log();
// });

// const answers = new Map();
// ctx.get_userinput().forEach((userinput) => {
//   const question = userinput.callback_identifier;
//   ctx.register_input_callback(question, (evt) => {
//     if (evt instanceof EventRequest)
//       answers.set(question, (evt as EventRequest).cont);
//     if (evt instanceof EventInvalidate) console.log(`INVALIDATE: ${question}`);
//     if (evt instanceof EventValidate) console.log(`VALIDATE: ${question}`);
//   });
// });
// ctx.evaluate(false);

// answers.get("a")(true);
// answers.get("b")(10);
// answers.get("a")(false);
// answers.get("c")(20);
