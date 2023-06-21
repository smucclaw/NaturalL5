import { writable } from 'svelte/store';

// This maps: question => answer
export const store_question_answers = writable(new Map<string, number | boolean | undefined>());

// This maps: question => (number | boolean)
// This is so that we can show the user the specific question rather than giving them
// true/false/numeric-value for all 3
export const store_question_type = writable(new Map<string, string>());
export const store_final = writable(0);
export const store_input = writable(``);
export const store_console = writable('');
