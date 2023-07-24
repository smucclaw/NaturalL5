<script lang="ts">
	import type { TraceFormatted } from '../../../web-runtime-prototype/src/TraceAst';
	import { toggle_hide } from './utils';

	export let trace: TraceFormatted;
	console.log(trace);
</script>

{#if trace != undefined}
	<div class="justification_container">
		<div class="individual_justification_container">
			{#each trace.template as template}
				{#if typeof template == 'string'}
					<span>{template}</span>
				{:else}
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<span class="clickable" on:click={() => toggle_hide(template.id.toString())}
						>{template.shortform}</span
					>
				{/if}
			{/each}
			<span> = {trace.result}</span>
		</div>

		{#each trace.template as template}
			{#if typeof template != 'string'}
				<div id={template.id.toString()} style="display: none;">
					<svelte:self trace={template} />
				</div>
			{/if}
		{/each}
	</div>
{/if}

<style src="./page.css">
</style>
