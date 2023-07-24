import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type { TraceFormatted } from '../../../web-runtime-prototype/src/TraceAst';

// This maps the questions that the user has answered
// : question => answer
export const store_current_question_answers = writable(
	new Map<string, number | boolean | undefined>()
);

// This maps: question => (number | boolean)
// This is so that we can show the user the specific question rather than giving them
// true/false/numeric-value for all 3
export const store_current_question_type = writable(new Map<string, string>());

// This stores the output of the evaluation
export const store_final = writable(0);

// This stores the source code for the DSL, that then gets
// passed to the evaluator for evluation
// export const store_editor_value = writable('');
export const store_editor_value = writable(`
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
    @ "get_plan_sum {plan_state}"
    plan_state.a ? plan_a_sum :
    plan_state.b ? plan_b_sum :
    plan_c_sum
}
function handle_sight_related(sight_related, plan_sum) {
    @ "handle_sight_related {plan_state}"
    (sight_related.lost_sight_in_both_eyes) ? (plan_sum / 100) * 150 :
    (sight_related.lost_sight_in_one_eyes)  ? (plan_sum * 1)         :
    (sight_related.lost_lens_of_one_eye)    ? (plan_sum / 100) * 50  : 0
}
function handle_speech_related(speech_related, plan_sum) {
    @ "handle_speech_related {plan_sum}"
    (speech_related.lost_speech_and_hearing)  ? (plan_sum / 100) * 150 : 
    (speech_related.lost_speech)              ? (plan_sum / 100) * 50  : 
    (speech_related.all_hearing_in_both_ears) ? (plan_sum / 100) * 75  : 
    (speech_related.all_hearing_in_one_ear)   ? (plan_sum / 100) * 50  : 0
}
function handle_client(client_state) {
    @ "handle_client {client_state}"
    var plan_sum = get_plan_sum(client_state.plan_state);
    (client_state.prior.dead)                             ? (plan_sum*1)                                                 :
    (client_state.prior.totally_and_permanently_disabled) ? (plan_sum / 100) * 150                                       :
    (client_state.prior.sight_related)                    ? handle_sight_related(client_state.sight_related, plan_sum)   :
    (client_state.prior.speech_related)                   ? handle_speech_related(client_state.speech_related, plan_sum) : 0
}
handle_client(client)
`);

// All error messages will be passed to this console
export const store_console = writable('');

// This maps: question => (boolean)
// There are cases where the question can be invalidated, and when they
// are invalidated, or consequently validated, this map will keep
// track of those changes.
export const store_question_validity = writable(new Map<string, boolean>());

export const store_justification_trace: Writable<TraceFormatted | undefined> = writable(undefined);

export const store_justification_cdecl_id_map = writable(new Map<string, number>());
