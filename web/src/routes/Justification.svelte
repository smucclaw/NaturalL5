<script lang="ts">
	import { TLit_str, type TraceFormatted } from '../../../web-runtime-prototype/src/TraceAst';
	import { toggle_hide } from './utils';

	export let trace: TraceFormatted;
</script>

{#if trace != undefined}
	<div class="justification_container">
		<div class="individual_justification_container">
			<span class="justification-title">{trace.shortform}</span>
				<span class="justification-value">({TLit_str(trace.result, 0)})</span> = {#each trace.template as item}
				{#if typeof item == 'string'}
					<span>{item}</span>
				{:else if item.tag == "TraceFormattedQuestion"}
					<span class="justification-literal">{item.shortform}</span>
				{:else if item.tag == "TraceFormattedLiteral"}
					<span class="justification-question">{item.shortform}</span>
				{:else}
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<span class="clickable" on:click={() => toggle_hide(item.id.toString())}
						>{item.shortform} <span class="justification-value"
							>({TLit_str(item.result, 0)})</span
						></span
					>
				{/if}
			{/each}
		</div>

		{#each trace.template as item}
			{#if item.tag == "TraceFormatted"}
				<div id={item.id.toString()} style="display: none;">
					<svelte:self trace={item} />
				</div>
			{/if}
		{/each}
	</div>
{/if}
