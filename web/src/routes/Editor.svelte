<script lang="ts">
	import loader from '@monaco-editor/loader';
	import { onDestroy, onMount } from 'svelte';
	import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
	import type { Writable } from 'svelte/store';

	// Store configs
	export let editor_value: Writable<string>;

	// let editor: Monaco.editor.IStandaloneCodeEditor;
	let monaco: typeof Monaco;
	let editorContainer: HTMLElement;

	onMount(async () => {
		const monacoEditor = await import('monaco-editor');
		loader.config({ monaco: monacoEditor.default });

		monaco = await loader.init();

		const item = localStorage.getItem('editor_value');
		if (item != undefined) editor_value.set(item);

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
			localStorage.setItem('editor_value', editor.getValue());
		});
	});

	onDestroy(() => {
		monaco?.editor.getModels().forEach((model) => model.dispose());
	});
</script>

<div class="editor" bind:this={editorContainer} />

<style>
	.editor {
		width: 100%;
		height: 100%;
		/* border: 1px; */
		/* border-color: black; */
		/* border-style: solid; */
	}
</style>
