<script lang="ts">
	import type * as Ast from '../../../web-runtime-prototype/src/AstNode';
	import { EvaluatorContext } from '../../../web-runtime-prototype/src/Evaluator';
	import { onMount } from 'svelte';
	import type { Writable } from 'svelte/store';
	import {
		EventRequest,
		EventWaiting,
		EventResult,
		EventValidate,
		EventInvalidate,
		type OutputEvent
	} from '../../../web-runtime-prototype/src/CallbackEvent';

	import Question from './Question.svelte';

	export let input: Writable<string>;
	export let question_answers: Writable<Map<string, Ast.PrimitiveType>>;
	export let question_type: Writable<Map<string, string>>;
	export let final: Writable<number>;
	export let logger: Writable<string>;
	export let question_validity: Writable<Map<string, boolean>>;

	const output_callback = (x: OutputEvent) => {
		if (x instanceof EventResult) {
			// console.log('DONE     : ', `${x.result}`);
			final.set(x.result as number);
		}
		if (x instanceof EventWaiting) {
			// console.log('WAITING  :', x.userinput.toString());
			final.set(0);
		}
	};

	const input_callback = (ctx: EvaluatorContext, userinput: Ast.UserInputLiteral) => {
		const question = userinput.callback_identifier;
		ctx.register_input_callback(question, (evt) => {
			if (evt instanceof EventRequest) {
				handle_request(question, userinput.type, evt);
			}
			if (evt instanceof EventValidate) {
				handle_validate(question);
			}
			if (evt instanceof EventInvalidate) {
				handle_invalidate(question);
			}
		});
	};

	const handle_request = (question: string, type: string, evt: EventRequest) => {
		question_answers.update((map) => map.set(question, undefined));
		question_type.update((map) => map.set(question, type));

		let prev: Ast.PrimitiveType = undefined;
		question_answers.subscribe((d) => {
			// Get value back from the form
			if (d.get(question) != prev && d.get(question) != undefined) {
				prev = d.get(question);
				// Try to continue evaluation, if it errors out then log it to the console
				// This is for evaluation error messages
				try {
					evt.cont(prev);
					logger.set('Ran fine!');
				} catch (error) {
					logger.set(error as string);
				}
			}
		});
	};

	const handle_validate = (question: string) => {
		question_validity.update((map) => map.set(question, true));
	};

	const handle_invalidate = (question: string) => {
		question_validity.update((map) => map.set(question, false));
	};

	const evaluate_program = (user_input: string) => {
		// This try catch is for the parser error messages in from_program
		try {
			const ctx = EvaluatorContext.from_program(user_input, output_callback);
			ctx.get_userinput().forEach((userinput) => input_callback(ctx, userinput));
			ctx.evaluate();
			// If it didn't catch out above, then show a happy message
			logger.set('Ran fine!');
		} catch (error) {
			logger.set(error as string);
		}
	};

	onMount(() => {
		// Run once when mounted
		evaluate_program($input);
		// Run every time the input gets changed
		input.subscribe((user_input) => {
			question_answers.set(new Map());
			question_type.set(new Map());
			evaluate_program(user_input);
		});
	});
</script>

<div id="form">
	{#each [...$question_answers] as [q, _]}
		<Question question={q} type={$question_type.get(q)} />
	{/each}

	<div id="result">
		<p>Claimable: {$final}</p>
	</div>
</div>

<style>
	#form {
		/* Center the div element */
		width: 75%;
		margin: auto;
	}
</style>
