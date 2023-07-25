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
export const store_editor_value = writable(``);

// All error messages will be passed to this console
export const store_console = writable('');

// This maps: question => (boolean)
// There are cases where the question can be invalidated, and when they
// are invalidated, or consequently validated, this map will keep
// track of those changes.
export const store_question_validity = writable(new Map<string, boolean>());

export const store_justification_trace: Writable<TraceFormatted | undefined> = writable(undefined);
