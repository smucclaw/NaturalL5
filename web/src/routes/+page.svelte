<script lang="ts">
	import type * as Ast from '../../../web-runtime-prototype/src/AstNode';
	import {
		store_question_answers,
		store_question_type,
		store_final,
		store_input,
		store_console
	} from './stores';
	import Form from './Form.svelte';

	const defined_fini_callback = (a: Ast.LiteralType) => {
		store_final.set(a as number);
	};

	const defined_reset_callback = () => {
		store_final.set(0);
	};
</script>

<Form
	input={store_input}
	fini_callback={defined_fini_callback}
	reset_callback={defined_reset_callback}
	question_answers={store_question_answers}
	question_type={store_question_type}
	final={store_final}
	logger={store_console}
/>
