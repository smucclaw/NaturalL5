// import { EvaluatorContext } from "./Evaluator";
import * as Ast from "./AstNode";
import { lex } from "./Lexer";
import { parse } from "./Parser";

const test = "";

const tokens = lex(test);
console.log(tokens);
const block: Ast.Block = parse(tokens);
console.dir(block, { depth: null });
// import { EvaluatorContext } from "./Evaluator";
import * as Ast from "./AstNode";
import { lex } from "./Lexer";
import { parse } from "./Parser";

const test = "";

const tokens = lex(test);
console.log(tokens);
const block: Ast.Block = parse(tokens);
console.dir(block, { depth: null });
import { EventInvalidate, EventRequest, EventResult, EventValidate, EventWaiting } from "./CallbackEvent";
import { EvaluatorContext } from "./Evaluator";

let code;
code = "";
code = `
function fib(n, m) {
  function helper(n, a, b) {
    if (n == 0)
    then (a*m)
    else (helper(n-1, a+b, a))
  }
  helper(n, 1, 1)
}
var n = UserInput(number, "value of n");
var m = UserInput(number, "value of m");
fib(n, m)
`;
//code = `
//var n = UserInput(number, "value of n");
//function f(x, n) {
//  if (x == 0) 
//  then (n) 
//  else (f(x-1, n))
//}
//f(10, n)
//`;
//code = `
//var a = UserInput(boolean, "Are you plan A?");
//var b = UserInput(boolean, "Are you plan B?");
//var both_eyes = UserInput(boolean, "Did you lose both eyes?");
//var one_eye = UserInput(boolean, "Did you lose one eye?");
//{
//  if (a) then 
//    if both_eyes then 150 else 
//    if one_eye then 100 else 0
//  else if (b) then
//    if both_eyes then 300 else 
//    if one_eye then 200 else 0
//  else 0
//}
//`
//
code = `
var client = Client{
  age = UserInput(number, "What is your age?");
  has_injuries = UserInput(boolean, "Do you have any existing medical conditions?");
};
{
  var r = Result{
    minutes_alive = client.age * 365 * 24;
    minutes_left = if client.has_injuries then 0 else 100;
  };
  r
}
`

code = `
var a = UserInput(boolean, "a");
var b = UserInput(number, "b");
var c = UserInput(number, "c");
if a then b else c
`

code = `
var plan_a_sum = 100000 ;
var plan_b_sum = 200000 ;
var plan_c_sum = UserInput(number, "What is your plan sum?") ;

var client = Client {
    plan_state = Plan {
        a = UserInput(boolean, "Are you plan A?"); 
        b = UserInput(boolean, "Are you plan B?");
    };
    prior = Prior {
        dead = UserInput(boolean, "Are you dead?");
        totally_and_permanently_disabled = UserInput(boolean, "Are you totally and permanently disabled?");
        sight_related = UserInput(boolean, "Is your injury sight related?");
        speech_related =  UserInput(boolean, "Is your injury speech related?");
    };
    sight_related = SightRelated {
        lost_sight_in_both_eyes = UserInput(boolean, "Did you lose sight of both eyes?");
        lost_sight_in_one_eyes = UserInput(boolean, "Did you lose sight of one eye?");
        lost_lens_of_one_eye = UserInput(boolean, "Did you lose lens of one eye?");
    };
    speech_related = SpeechRelated {
        lost_speech_and_hearing = UserInput(boolean, "Do you have permanent and total loss of speech and hearing?");
        lost_speech = UserInput(boolean, "Do you have permanent and total loss of speech?");
        all_hearing_in_both_ears = UserInput(boolean, "Do you have permanent and total loss of all hearing in both ears?");
        all_hearing_in_one_ear = UserInput(boolean, "Do you have permanent and total loss of all hearing in one ear?");
    };
};

function get_plan_sum(plan_state) {
    plan_state.a ? plan_a_sum : 
    plan_state.b ? plan_b_sum :
    plan_c_sum
}

function handle_sight_related(sight_related, plan_sum) {
    (sight_related.lost_sight_in_both_eyes) ? (plan_sum / 100) * 150   : 
    (sight_related.lost_sight_in_one_eyes)  ? (plan_sum * 1)           : 
    (sight_related.lost_lens_of_one_eye)    ? (plan_sum / 100) * 50    : 0
}

function handle_speech_related(speech_related, plan_sum) {
    (speech_related.lost_speech_and_hearing)          ? (plan_sum / 100) * 150   : 
    (speech_related.lost_speech)                      ? (plan_sum / 100) * 50    : 
    (speech_related.all_hearing_in_both_ears)         ? (plan_sum / 100) * 75    : 
    (speech_related.all_hearing_in_one_ear)           ? (plan_sum / 100) * 50    : 0
}

function handle_client(client_state) {
    var plan_sum = get_plan_sum(client_state.plan_state);
    (client_state.prior.dead)                             ? (plan_sum*1)            : 
    (client_state.prior.totally_and_permanently_disabled) ? (plan_sum / 100) * 150  : 
    (client_state.prior.sight_related) 
        ? handle_sight_related(client_state.sight_related, plan_sum) 
    :
    (client_state.prior.speech_related)
        ? handle_speech_related(client_state.speech_related, plan_sum) 
    : 0
}

handle_client(client)
`

const ctx = EvaluatorContext.from_program(
  code,
  (x) => {
    console.log()
    console.log(">>>>>>>")
    if (x instanceof EventResult)
      console.log("DONE     : ", `${x.result}`)
    if (x instanceof EventWaiting)
      console.log("WAITING  :", x.userinput.toString())
    console.log(">>>>>>>")
    console.log()
  },
);

const answers = new Map();
ctx.get_userinput().forEach(userinput => {
  const question = userinput.callback_identifier;
  ctx.register_input_callback(question, (evt) => {
    if (evt instanceof EventRequest)
      answers.set(question, (evt as EventRequest).cont);
    if (evt instanceof EventInvalidate)
      console.log(`INVALIDATE: ${question}`)
    if (evt instanceof EventValidate)
      console.log(`VALIDATE: ${question}`)
  });
});
ctx.evaluate(false);

answers.get("a")(true);
answers.get("b")(10);
answers.get("a")(false);
answers.get("c")(20);

/*
console.log(answers)
answers.get("What is your age?")(10);
console.log(answers)
answers.get("Do you have any existing medical conditions?")(false);
console.log(answers)

console.log("UWU")

answers.get("What is your age?")(20);
answers.get("Do you have any existing medical conditions?")(true);
*/

/*
console.log(answers);
answers.get("value of n")()(true);
console.log(answers);
answers.get('value of m')()(100);

console.log("###########################################");
answers.get("value of n")()(false);
answers.get('value of m')()(1000);
*/