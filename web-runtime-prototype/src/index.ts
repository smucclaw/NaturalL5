import {
  EventResult,
  EventWaiting,
  EventRequest,
  EventValidate,
  EventInvalidate,
} from "./CallbackEvent";
import { EvaluatorContext } from "./Evaluator";

const code = ` 
var a = UserInput(boolean, "a"); 
var b = UserInput(number, "b"); 
var c = UserInput(number, "c"); 
if a then b else c 
`;

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

answers.get("a")(true);
answers.get("b")(10);
answers.get("a")(false);
answers.get("c")(20);
