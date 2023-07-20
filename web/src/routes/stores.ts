import { writable } from 'svelte/store';

// This maps: question => answer
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
export const store_editor_value = writable('');

// All error messages will be passed to this console
export const store_console = writable('');

// This maps: question => (boolean)
// There are cases where the question can be invalidated, and when they
// are invalidated, or consequently validated, this map will keep
// track of those changes.
export const store_question_validity = writable(new Map<string, boolean>());

// This tells the program whether the form is in "preanswer" state
// The "preanswer" state is when the form shows all possible "answerable"
// questions and asks the user if they have the answers to these questions beforehand
export const store_preanswer = writable(false);

// TODO:
export const store_all_userinput = writable(0);
