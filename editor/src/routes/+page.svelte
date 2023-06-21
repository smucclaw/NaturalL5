<script lang="ts">
	import loader from '@monaco-editor/loader';
	import { onDestroy, onMount } from 'svelte';
	import { editor_value, store_console } from './stores';
	import {
		store_question_answers,
		store_question_type,
		store_final
	} from '../../../web/src/routes/stores';
	import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
	import type * as Ast from '../../../web-runtime-prototype/src/AstNode';
	import Form from '../../../web/src/routes/Form.svelte';

	let editor: Monaco.editor.IStandaloneCodeEditor;
	let monaco: typeof Monaco;
	let editorContainer: HTMLElement;

	onMount(async () => {
		const monacoEditor = await import('monaco-editor');
		loader.config({ monaco: monacoEditor.default });

		monaco = await loader.init();

		// Create monaco instance
		const editor = monaco.editor.create(editorContainer, {
			// Disbale minimap, more options can be built on here
			minimap: {
				enabled: false
			},
			automaticLayout: true
		});
		const model = monaco.editor.createModel(
			$editor_value,
			undefined
			// Syntax highlighting
			// monaco.Uri.file('sample.js')
		);
		editor.setModel(model);

		// Monaco on change event, this can only be called post-mount
		// Update the store with the editor value
		editor.getModel()?.onDidChangeContent((_) => {
			editor_value.set(editor.getValue());
		});
	});

	onDestroy(() => {
		monaco?.editor.getModels().forEach((model) => model.dispose());
	});

	const defined_fini_callback = (a: Ast.LiteralType) => {
		store_final.set(a as number);
	};

	const defined_reset_callback = () => {
		store_final.set(0);
	};
</script>

<h1>Editor</h1>
<div class="container">
	<div class="editor-container">
		<div class="editor" bind:this={editorContainer} />
	</div>

	<div class="console-form-container">
		<div class="form-container">
			<Form
				input={editor_value}
				fini_callback={defined_fini_callback}
				reset_callback={defined_reset_callback}
				question_answers={store_question_answers}
				question_type={store_question_type}
				final={store_final}
				logger={store_console}
			/>
		</div>
		<div class="console-container">
			{$store_console}
		</div>
	</div>
</div>

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

	.editor {
		width: 100%;
		height: 100%;
		/* border: 1px; */
		/* border-color: black; */
		/* border-style: solid; */
	}

	.console-form-container {
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

	.console-container {
		height: 30%;
		border: 1px;
		border-color: black;
		border-style: solid;
	}
</style>
