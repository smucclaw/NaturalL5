import * as Ast from "./AstNode";
import { lex } from "./Lexer";
import { Token } from "./Token";
import { parse } from "./Parser";
import { transform_program } from "./SyntacticAnalysis";
import { EvaluatorContext } from "./Evaluator";

// let ast;
// ast = new Ast.BinaryOp(
//   "+",
//   new Ast.BinaryOp(
//     "+",
//     new Ast.BinaryOp("*", new Ast.Literal(10), new Ast.Literal(5)),
//     new Ast.Literal(2)
//   ),
//   new Ast.Literal(3)
// );
// ast = new Ast.LogicalComposition(
//   "||",
//   new Ast.Literal(false),
//   new Ast.BinaryOp("<", new Ast.Literal(10), new Ast.Literal(5))
// );
// console.log(ast);
// console.dir(ast, { depth: null });
// const ast = new Ast.BinaryOp("+",
//     new Ast.BinaryOp("+",
//         new Ast.BinaryOp("*", new Ast.Literal(10), new Ast.Literal(5)),
//         new Ast.Literal(2)),
//     new Ast.Literal(3));

// const ast = new Ast.BinaryOp(
//   "+",
//   new Ast.BinaryOp(
//     "+",
//     new Ast.BinaryOp("*", new Ast.Literal(10), new Ast.Literal(5)),
//     new Ast.Literal(2)
//   ),
//   new Ast.Literal(3)
// );
// console.log(ast);

// const ctx = new EvaluatorContext(ast);
// console.log(ctx.evaluate());

// const ast = new Ast.BinaryOp("+",
//     new Ast.BinaryOp("+",
//         new Ast.BinaryOp("*", new Ast.Literal(10), new Ast.Literal(5)),
//         new Ast.Literal(2)),
//     new Ast.Literal(3));

// const ast = new Ast.BinaryOp(
//   "+",
//   new Ast.BinaryOp(
//     "+",
//     new Ast.BinaryOp("*", new Ast.Literal(10), new Ast.Literal(5)),
//     new Ast.Literal(2)
//   ),
//   new Ast.Literal(3)
// );
// console.log(ast);

// const ctx = new EvaluatorContext(ast);
// console.log(ctx.evaluate());

// const test = `
// var a = 10;
// var b = 20;
// var c = (10 + 20);
// var d = ((10 + 20) + 30);

// function a(a, b, c) {
//     (10 + 1)
// }

// function b(x, y, z) {
//     (x + y + z)
// }
// `;

// const test = `
// function f(x) {
//   if (x <= 0)  then (100) else (f(x-1))
// }

// f(1)
// `;

const test = `
var a = UserInput(boolean, "do_you_have_plan_a");
var b = UserInput(boolean, "do_you_have_plan_b");
var c = UserInput(boolean, "do_you_have_plan_c");
var d = UserInput(boolean, "do_you_have_plan_d");
var e = UserInput(boolean, "do_you_have_plan_e");
var f = UserInput(boolean, "do_you_have_plan_f");

// Open a block to start computation
{
  var plan_a_sum = if a then 100000  else 0;
  var plan_b_sum = if b then 200000  else 0;
  var plan_c_sum = if c then 300000  else 0;
  var plan_d_sum = if d then 500000  else 0;
  var plan_e_sum = if e then 750000  else 0;
  var plan_f_sum = if f then 1000000 else 0;

  function dead() { UserInput(boolean, "are_you_dead") }
  function totally_and_permanently_disabled() { UserInput(boolean, "are_you_totally_and_permanently_disabled") }

  function sight_related() { UserInput(boolean, "is_your_injury_sight_related") }
  function lost_sight_in_both_eyes() { UserInput(boolean, "did_you_lose_sight_in_both_eyes") }
  function lost_sight_in_one_eyes() { UserInput(boolean, "did_you_lose_sight_in_one_eyes") }
  function lost_lens_of_one_eye() { UserInput(boolean, "did_you_lose_lens_of_one_eye") }

  function speech_related() { UserInput(boolean, "is_your_injury_speech_related") }
  function lost_speech_and_hearing() { UserInput(boolean, "do you have permanent and total loss of speech and hearing") }
  function lost_speech() { UserInput(boolean, "do you have permanent and total loss of speech") }
  function all_hearing_in_both_ears() { UserInput(boolean, "do you have permanent and total loss of all hearing in both ears") }
  function all_hearing_in_one_ear() { UserInput(boolean, "do you have permanent and total loss of all hearing in one ear") }

  // Note that % is a temporary replacement for integer division here
  function main() {
     if sight_related() then
       if      (a && dead())                             then plan_a_sum * 1
       else if (a && totally_and_permanently_disabled()) then plan_a_sum % 100 * 150 
       else if (a && lost_sight_in_both_eyes())          then plan_a_sum % 100 * 150
       else if (a && lost_sight_in_one_eye())            then plan_a_sum * 1
       else if (a && lost_lens_of_one_eye())             then plan_a_sum % 100 * 50
       else 0 
     else if speech_related() then 
       if      (a && lost_speech_and_hearing())          then plan_a_sum % 100 * 150
       else if (a && lost_speech())                      then plan_a_sum % 100 * 50
       else if (a && all_hearing_in_both_ears())         then plan_a_sum % 100 * 75
       else if (a && all_hearing_in_one_ears())          then plan_a_sum % 100 * 50
       else 0
     else 0
  }
}

`;

//   var a = if (x <= 10 && b()) then 20 else 30;

// var n = 2;
// {
//   n-1
// }
// `;

// const tokens: Array<Token> = lex("(10*5) + 3 + 2");
// const tokens: Array<Token> = lex("(3 + 5)");
const tokens: Array<Token> = lex(test);
console.log("-- Lexer tokens --");
console.dir(tokens, { depth: null });
console.log("-- Lexer tokens --");

const ast: Ast.Block = parse(tokens);
console.log("-- Parser tokens --");
console.dir(ast, { depth: null });
console.log("-- Parser tokens --");

const eval_ast: Ast.Block = transform_program(ast);
console.log(eval_ast.toString());

const ctx = EvaluatorContext.from_program(
  eval_ast,
  new Map([
    [
      "do_you_have_plan_a",
      () => {
        return true;
      },
    ],
  ])
);
console.log(ctx.evaluate());

// (10 * 5) + 3
// ((10 * 5) + 3)

`
-- everything in a block ends with a semi colon
function a() {
    (10 + 1);
}

-- expressions also end with semi colons
var a = 10;
(10+1);
`;
