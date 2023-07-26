import {
  EventResult,
  EventWaiting,
  EventRequest,
  EventValidate,
  EventInvalidate,
} from "./CallbackEvent";
import { EvaluatorContext } from "./Evaluator";
import { format_trace } from "./TraceAst";

let code: string;
code = ''
code = `
function uwu(x, y, z) {
  @"Applied uwu on {x}, {y} and {z}, returns {%}"
  x ? y + z : y - z
}
var \`a\` = UserInput(boolean, "a");
var \`b\` = UserInput(number, "b");
var \`c\` = UserInput(number, "c");
uwu(a,b,c) * 100
`;
code = `
var x = 10;
{
var r = Result {
  a = 1;
  b = r.a + x;
  c = Result2 {
    d = r.a;
  };
};
r
}
`;

code = `
var x = 10;
{
var r = Result {
  a = 1;
  b = r.a + x;
  c = Result2 {
    d = r.a;
  };
};
r.b * 5
}
`;

code = `
function helper(a,b,n) {
  @"Helper function, remaining {n}th iteration, returning {%}"
  n == 0 ? a : helper(a+b, a, n - 1)
}
function fib(n) {
  @"Computing the {n}th fibonaci number, returning {%}"
  helper(1,1,n)
}

fib(3)
`

code = `
var a = UserInput(boolean, "What is a?");
var b = UserInput(number, "What is b?");
var c = UserInput(number, "What is c?");
{
  var d = c + c;
  var e = b * b + 50;
  var f = b + 10;
  a ? d > 100 ? d * e * f : 0 : 0
}
`

code = `
var a = UserInput(boolean, "What is a?");
var b = UserInput(boolean, "What is b?");
var c = UserInput(number, "What is c?");
{
var uwu = switch {
  case a && b: { 100 }
  case c + 1 < 10: { 200 }
  case 1 == 0: { 300 }
  default: { 400 }
};
uwu * 10
}
`

code = `
var a = UserInput(boolean, "What is a?");
var b = UserInput(number, "What is b?");
var c = UserInput(number, "What is c?");

function uwu(x,y,z) {
  @"Uwuing {x}, {y} and {z} to obtain {%}"
  x ? y + z : y * z
}
-uwu(a,b+b,c)
`


const ctx = EvaluatorContext.from_program(code, (x) => {
  console.log();
  console.log(">>>>>>>");
  if (x instanceof EventResult) {
    console.log("DONE     : ", `${x.result}`);
    console.log(`TRACE    :\n${x.trace}`)
    console.log(`TRACEFORM:\n${format_trace(x.trace!, "program")}`)
  }
  if (x instanceof EventWaiting)
    x.userinputs.forEach((u) => console.log("WAITING  :", u.toString()));
  console.log(">>>>>>>");
  console.log();
});

const answers = new Map();
ctx.get_userinput().forEach((userinput) => {
  const question = userinput.callback_identifier;
  ctx.register_input_callback(question, (evt) => {
    if (evt instanceof EventRequest)
      answers.set(question, (evt as EventRequest).cont);
    if (evt instanceof EventInvalidate) console.log(`INVALIDATE: ${question}`);
    if (evt instanceof EventValidate) console.log(`VALIDATE: ${question}`);
  });
});
ctx.evaluate(false);

answers.get("What is a?")(false);
answers.get("What is b?")(0);
answers.get("What is c?")(20);

//answers.get("What is a?")(false);
//answers.get("What is b?")(10);
//answers.get("What is c?")(10);
//answers.get("What is a?")(false);
//answers.get("What is c?")(20);

 
// sum(a+a, b, c)
//  sum takes {}...
//  operation: x + y + z
//    x = a
//      a = answer to question "a": 12