export function toggle_hide(element_id: string) {
	console.log(`called toggle_hide : ${element_id}`);

	const element = document.getElementById(element_id);
	if (element == undefined) return;

	if (element.style.display == 'none') element.style.display = 'block';
	else element.style.display = 'none';
}
