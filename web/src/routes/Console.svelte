<script lang="ts">
	import type { Writable } from 'svelte/store';

	export let console: Writable<string>;
</script>

<div class="console">
	{$console}
</div>

<style>
	.console {
		font-family: monospace;
	}
</style>
