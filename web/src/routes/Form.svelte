<script lang="ts">
	import type * as Ast from '../../../web-runtime-prototype/src/AstNode';
	import {
		EvaluatorContext,
		type OutputCallback_t,
		type UndefinedCallback_t
	} from '../../../web-runtime-prototype/src/Evaluator';
	import { onMount } from 'svelte';
	import type { Writable } from 'svelte/store';

	import Question from './Question.svelte';

	export let fini_callback: OutputCallback_t;
	export let reset_callback: UndefinedCallback_t;

	export let input: Writable<string>;
	export let question_answers: Writable<Map<string, Ast.PrimitiveType>>;
	export let question_type: Writable<Map<string, string>>;
	export let final: Writable<number>;
	export let logger: Writable<string>;

	const evaluate_program = (user_input: string) => {
		try {
			const ctx = EvaluatorContext.from_program(
				user_input,
				fini_callback as OutputCallback_t,
				reset_callback
			);
			ctx.get_userinput().forEach((userinput) => {
				const question = userinput.callback_identifier;
				ctx.register_callback(question, (_) => {
					let prev: Ast.PrimitiveType = undefined;
					question_answers.update((map) => map.set(question, undefined));
					question_type.update((map) => map.set(question, userinput.type));
					question_answers.subscribe((d) => {
						// Get value back from the form
						if (d.get(question) != prev) {
							prev = d.get(question);
							try {
								console.log('###', ctx.get_continuation(question)(prev));
								logger.set('Ran fine!');
							} catch (error) {
								logger.set(error as string);
							}
						}
					});
				});
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
