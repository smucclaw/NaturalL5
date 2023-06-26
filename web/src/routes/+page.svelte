<script lang="ts">
	import type * as Ast from '../../../web-runtime-prototype/src/AstNode';
	import {
		store_question_answers,
		store_question_type,
		store_final,
		store_console,
		store_editor_value
	} from './stores';
	import Form from './Form.svelte';
	import Editor from './Editor.svelte';
	import Console from './Console.svelte';

	const defined_fini_callback = (a: Ast.LiteralType) => {
		store_final.set(a as number);
	};

	const defined_reset_callback = () => {
		store_final.set(0);
	};
</script>

<!-- With the editor -->
<div class="container">
	<div class="editor-container">
		<Editor editor_value={store_editor_value} />
	</div>
	<div class="form-console-container">
		<div class="form-container">
			<Form
				input={store_editor_value}
				fini_callback={defined_fini_callback}
				reset_callback={defined_reset_callback}
				question_answers={store_question_answers}
				question_type={store_question_type}
				final={store_final}
				logger={store_console}
			/>
		</div>
		<div class="console-container">
			<Console console={store_console} />
		</div>
	</div>
</div>

<!-- Without the editor and console, just deploy the form -->
<!-- <div class="sole-form-container">
	<Form
		input={store_editor_value}
		fini_callback={defined_fini_callback}
		reset_callback={defined_reset_callback}
		question_answers={store_question_answers}
		question_type={store_question_type}
		final={store_final}
		logger={store_console}
	/>
</div> -->

<style>
	.container {
		width: 100%;
		height: 100vh;
	}

	.editor-container {
		float: left;
		width: 60%;
		height: 100%;
		border: 1px;
		border-color: red;
		border-style: solid;
	}

	.form-console-container {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.form-container {
		height: 70%;
		border: 1px;
		border-color: black;
		border-style: solid;
		overflow: auto;
	}

	/* .sole-form-container {
		overflow:auto;
	} */

	.console-container {
		height: 30%;
		border: 1px;
		border-color: black;
		border-style: solid;
	}
</style>
