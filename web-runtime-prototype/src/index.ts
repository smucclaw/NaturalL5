// import { EvaluatorContext } from "./Evaluator";
import * as Ast from "./AstNode";
import { lex } from "./Lexer";
import { parse } from "./Parser";

let test = "";
test = `
var plan_a_sum = 100000;
var plan_b_sum = 200000;
var plan_c_sum = UserInput(number, "What is your plan sum?");
`;
test = `
  if plan_state then plan_a_sum else 0
`;
test = `
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
    if plan_state.a then plan_a_sum else 
    if plan_state.b then plan_b_sum else
    plan_c_sum
}
function handle_sight_related(sight_related, plan_sum) {
    if (sight_related.lost_sight_in_both_eyes) then (plan_sum / 100) * 150   else 
    if (sight_related.lost_sight_in_one_eyes)  then (plan_sum * 1)           else 
    if (sight_related.lost_lens_of_one_eye)    then (plan_sum / 100) * 50    else 0
}
function handle_speech_related(speech_related, plan_sum) {
    if (speech_related.lost_speech_and_hearing)          then (plan_sum / 100) * 150   else 
    if (speech_related.lost_speech)                      then (plan_sum / 100) * 50    else 
    if (speech_related.all_hearing_in_both_ears)         then (plan_sum / 100) * 75    else 
    if (speech_related.all_hearing_in_one_ear)           then (plan_sum / 100) * 50    else 0
}
function handle_client(client_state) {
    var plan_sum = get_plan_sum(client_state.plan_state);
    if (client_state.prior.dead)                             then (plan_sum*1)            else 
    if (client_state.prior.totally_and_permanently_disabled) then (plan_sum / 100) * 150  else 
    if (client_state.prior.sight_related) 
        then handle_sight_related(client_state.sight_related, plan_sum) 
    else
    if (client_state.prior.speech_related)
        then handle_speech_related(client_state.speech_related, plan_sum) 
    else 0
}
handle_client(client)
`;
test = `
  function a(x, y, z) {
    x + y + z
  }
`;
test = `
  var a = x ? y : z;
`;
test = `
  var a = if x else z
`;

const tokens = lex(test);
console.log(tokens);
const block: Ast.Block = parse(tokens);
console.dir(block, { depth: null });
