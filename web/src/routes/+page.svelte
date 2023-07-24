<script lang="ts">
	import type * as Ast from '../../../web-runtime-prototype/src/AstNode';
	import {
		store_current_question_answers,
		store_current_question_type,
		store_final,
		store_console,
		store_editor_value,
		store_question_validity,
		store_justification_trace
	} from './stores';
	import Form from './Form.svelte';
	import Editor from './Editor.svelte';
	import Console from './Console.svelte';

	// Global css
	import './page.css';
</script>

<!-- With the editor -->
<div class="container">
	<h1>Editor</h1>
	<div class="editor-container">
		<Editor editor_value={store_editor_value} />
	</div>
	<div class="form-console-container">
		<div class="form-container">
			<Form
				input={store_editor_value}
				current_question_answers={store_current_question_answers}
				current_question_type={store_current_question_type}
				final={store_final}
				logger={store_console}
				question_validity={store_question_validity}
				justification_trace={store_justification_trace}
			/>
		</div>
		<div class="console-container">
			<Console console={store_console} />
		</div>
	</div>
</div>

<!-- Without the editor and console, just deploy the form -->
<!-- <div class="container">
	<div class="sole-form-container">
		<Form
			input={store_editor_value}
			current_question_answers={store_current_question_answers}
			current_question_type={store_current_question_type}
			final={store_final}
			logger={store_console}
			question_validity={store_question_validity}
			preanswer={store_preanswer}
		/>
	</div>
</div> -->

<style>
	.container {
		/* width: 100%; */
		width: 100vw;
		height: 100vh;
	}

	.editor-container {
		float: left;
		width: 50%;
		height: 100%;
		border: 1px;
		border-color: red;
		border-style: solid;
	}

	.form-console-container {
		width: 50%;
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

	.sole-form-container {
		height: 100%;
		width: 100%;
		overflow: auto;
	}

	.console-container {
		height: 30%;
		border: 1px;
		border-color: black;
		border-style: solid;
	}
</style>
