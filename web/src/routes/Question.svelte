<script lang="ts">
	import type * as Ast from '../../../web-runtime-prototype/src/AstNode';
	import { store_current_question_answers, store_question_validity } from './stores';

	export let question: string;
	export let type: string;

	function update(value: Ast.PrimitiveType) {
		store_current_question_answers.update((map) => map.set(question, value));
	}

	function is_truthy(value: Ast.PrimitiveType): boolean | undefined {
		if (value == undefined) return undefined;
		if (value == false) return false;
		if (typeof value == 'number') return true;
		return true;
	}

	function is_falsey(value: Ast.PrimitiveType): boolean | undefined {
		if (value == undefined) return undefined;
		if (value == true) return false;
		if (typeof value == 'number') return false;
		return true;
	}

	function is_undefined(value: Ast.PrimitiveType): boolean | undefined {
		if (value == undefined) return true;
		else return false;
	}
</script>

<!-- Valid question -->
{#if $store_question_validity.get(question)}
	<div
		class="individual"
		class:success={is_truthy($store_current_question_answers.get(question))}
		class:failure={is_falsey($store_current_question_answers.get(question))}
		class:undefined={is_undefined($store_current_question_answers.get(question))}
	>
		<span>{question}</span>
		{#if type == 'boolean'}
			<div>
				<button type="button" class="btn btn-success" on:click={() => update(true)}>True</button>
				<button type="button" class="btn btn-danger" on:click={() => update(false)}>False</button>
			</div>
		{:else if type == 'number'}
			<div>
				<!-- <label for="number+{question}" /> -->
				<input
					type="number"
					id="number+{question}"
					class="form-control"
					value={$store_current_question_answers.get(question)}
				/>
				<button
					type="button"
					class="btn btn-success submit"
					on:click={() => update(parseInt(document.getElementById('number+' + question).value))}
				>
					Submit
				</button>
			</div>
		{:else}
			<p>This should not happen</p>
		{/if}
	</div>
{:else}
	<!-- Invalid Question -->
	<div class="individual invalid">
		<span>{question}</span>
		{#if type == 'boolean'}
			<div>
				<button type="button" class="btn btn-success disabled" on:click={() => update(true)}
					>True</button
				>
				<button type="button" class="btn btn-danger disabled" on:click={() => update(false)}
					>False</button
				>
			</div>
		{:else if type == 'number'}
			<div>
				<!-- <label for="number+{question}" /> -->
				<input type="number" id="number+{question}" class="form-control" />
				<button
					type="button"
					class="btn btn-success submit disabled"
					on:click={() => update(parseInt(document.getElementById('number+' + question).value))}
				>
					Submit
				</button>
			</div>
		{:else}
			<p>This should not happen</p>
		{/if}
	</div>
{/if}

<style>
</style>
