<script lang="ts">
	import type { Writable } from 'svelte/store';

	export let console: Writable<string>;
</script>

<div class="console">
	{$console}
</div>

<style>
</style>
