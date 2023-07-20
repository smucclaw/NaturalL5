import {
  EventResult,
  EventWaiting,
  EventRequest,
  EventValidate,
  EventInvalidate,
} from "./CallbackEvent";
import { EvaluatorContext } from "./Evaluator";

let code: string;
code = ''
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
`


const ctx = EvaluatorContext.from_program(code, (x) => {
  console.log();
  console.log(">>>>>>>");
  if (x instanceof EventResult) console.log("DONE     : ", `${x.result}`);
  if (x instanceof EventWaiting)
    console.log("WAITING  :", x.userinput.toString());
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

// answers.get("b")(10);
// answers.get("a")(true);
// answers.get("a")(false);
// answers.get("c")(20);
