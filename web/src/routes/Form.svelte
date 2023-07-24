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
	import Justification from './Justification.svelte';
	import { format_trace, type TraceFormatted } from '../../../web-runtime-prototype/src/TraceAst';

	export let input: Writable<string>;
	export let current_question_answers: Writable<Map<string, Ast.PrimitiveType>>;
	export let current_question_type: Writable<Map<string, string>>;
	export let final: Writable<number>;
	export let logger: Writable<string>;
	export let question_validity: Writable<Map<string, boolean>>;
	export let justification_trace: Writable<TraceFormatted | undefined>;

	// When the evaluator gives an output it should set the claimable output
	// Or it should set it to 0 (still computing)
	const output_callback = (x: OutputEvent) => {
		if (x instanceof EventResult) {
			// TODO : Render an execution trace using x.trace
			// console.log('@@@', x.trace);
			final.set(x.result as number);
			if (x.trace != undefined) {
				const formatted = format_trace(x.trace, 'Amount Claimable');
				console.log(formatted.toString());
				justification_trace.set(formatted);
			}
		}
		if (x instanceof EventWaiting) {
			// console.log('WAITING  :', x.userinput.toString());
			final.set(0);
		}
	};

	// For every UserInput, there will be an associated input_callback
	const input_callback = (ctx: EvaluatorContext, userinput: Ast.UserInputLiteral) => {
		// Get the question as a string
		const question = userinput.callback_identifier;
		// When the evaluator tries to evaluate the UserInput,
		// it'll call the registered input_callback (this)
		ctx.register_input_callback(question, (evt) => {
			// If its a request, we want to "ask" the user the question
			if (evt instanceof EventRequest) {
				handle_request(question, userinput.type, evt);
			}
			// We make it so that they can answer the question
			if (evt instanceof EventValidate) {
				handle_validate(question);
			}
			// We make it so that they cannot answer the question
			if (evt instanceof EventInvalidate) {
				handle_invalidate(question);
			}
		});
	};

	const handle_request = (question: string, type: string, evt: EventRequest) => {
		current_question_answers.update((map) => map.set(question, undefined));
		current_question_type.update((map) => map.set(question, type));

		let prev: Ast.PrimitiveType = undefined;
		current_question_answers.subscribe((d) => {
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
			ctx.get_userinput().forEach((userinput) => {
				input_callback(ctx, userinput);
			});
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
			current_question_answers.set(new Map());
			current_question_type.set(new Map());
			evaluate_program(user_input);
		});
	});
</script>

<div id="form">
	{#each [...$current_question_answers] as [q, _]}
		<Question question={q} type={$current_question_type.get(q)} />
	{/each}

	{#if $final == 0}
		<div id="result">
			<p>Claimable : Not enough questions answered to compute a claimable sum</p>
		</div>
	{:else}
		<div id="result">
			<p>Claimable: {$final}</p>
		</div>
	{/if}

	{#if $justification_trace != undefined}
		<div>
			<p>Justification Trace:</p>
			<Justification trace={$justification_trace} template={$justification_trace.template}/>
		</div>
	{/if}
</div>
