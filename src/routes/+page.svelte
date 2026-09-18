<script>
	import { onMount } from 'svelte';
	import WebVM from '$lib/WebVM.svelte';
	import * as debianConfig from '/config_terminal';

	const operatingSystems = [
		{ id: 'debian', name: 'Debian', detail: 'Terminal workspace', accent: '#d66b4f', ready: true, config: debianConfig },
		{ id: 'ubuntu', name: 'Ubuntu', detail: 'Desktop-ready image', accent: '#e08a39', ready: false },
		{ id: 'fedora', name: 'Fedora', detail: 'Developer workstation', accent: '#4f8ed6', ready: false },
		{ id: 'mint', name: 'Linux Mint', detail: 'Friendly desktop image', accent: '#4d9a71', ready: false },
		{ id: 'lineage', name: 'LineageOS', detail: 'Android-based image', accent: '#8d6ad6', ready: false }
	];

	const webApps = [
		{ name: 'Documentation', detail: 'Read the XDVM and CheerpX guides', url: 'https://cheerpx.io/docs/' },
		{ name: 'Source code', detail: 'Open the project repository', url: 'https://github.com/leaningtech/webvm' },
		{ name: 'CheerpX', detail: 'Explore browser virtualization', url: 'https://cheerpx.io/' }
	];

	let selectedOs = operatingSystems[0];
	let customImage = null;
	let customImageName = '';
	let customImageType = '';
	let imageMessage = '';
	let showCreate = false;
	let hostCores = 'Detecting';
	let hostStorage = 'Detecting';
	let launchedConfig = null;
	let launchedOs = null;

	onMount(async () => {
		hostCores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} logical cores` : 'Unavailable';
		if (navigator.storage?.estimate) {
			const estimate = await navigator.storage.estimate();
			const available = estimate.quota ? `${Math.round(estimate.quota / 1073741824)} GB browser quota` : 'Available';
			hostStorage = available;
		} else {
			hostStorage = 'Unavailable';
		}
	});

	function selectOs(os) {
		selectedOs = os;
		showCreate = false;
	}

	function handleImage(event) {
		customImage = event.currentTarget.files?.[0] || null;
		customImageName = customImage?.name || '';
		if (customImage) {
			customImageType = customImage.name.toLowerCase().endsWith('.iso') ? 'iso' : 'ext2';
			selectedOs = { id: 'custom', name: 'Custom image', detail: customImageType === 'iso' ? 'Local ISO image' : 'Local .ext2 image', accent: '#b8a27c', ready: customImageType === 'ext2' };
			imageMessage = customImageType === 'iso'
				? 'ISO imported. Direct ISO boot needs a BIOS/CD device, which this CheerpX root filesystem setup does not provide yet. Convert it to an .ext2 image to launch it.'
				: 'EXT2 image ready to launch in this browser.';
		}
	}

	function launch() {
		if (!selectedOs.ready && !customImage) {
			showCreate = true;
			return;
		}
		if (customImageType === 'iso') {
			showCreate = true;
			return;
		}
		const imageUrl = customImage ? URL.createObjectURL(customImage) : null;
		launchedConfig = imageUrl ? {
			diskImageUrl: imageUrl,
			diskImageType: 'bytes',
			printIntro: true,
			needsDisplay: false,
			cmd: '/bin/bash',
			args: ['--login'],
			opts: debianConfig.opts
		} : selectedOs.config;
		launchedOs = selectedOs;
	}

	function resetLauncher() {
		if (customImage) URL.revokeObjectURL(launchedConfig?.diskImageUrl);
		launchedConfig = null;
		launchedOs = null;
	}
</script>

<svelte:head>
	<title>XDVM | Linux in your browser</title>
	<meta name="description" content="XDVM is a browser-based Linux workspace with virtual machines and web apps." />
</svelte:head>

{#if launchedConfig}
	<div class="vm-shell">
		<button class="back-button" on:click={resetLauncher} aria-label="Return to XDVM launcher">← <span>XDVM launcher</span></button>
		<WebVM configObj={launchedConfig} cacheId={`blocks_${launchedOs.id}`}>
			<p>Running {launchedOs.name}. <button class="underline" on:click={resetLauncher}>Return to launcher</button></p>
		</WebVM>
	</div>
{:else}
	<main class="launcher">
		<header class="topbar">
			<div class="brand"><span class="brand-mark">X</span><span>XDVM</span></div>
			<div class="topbar-status"><span class="status-dot"></span> Browser virtualization <span class="status-divider"></span> {hostCores}</div>
		</header>

		<section class="hero">
			<div>
				<p class="eyebrow">YOUR PERSONAL COMPUTE DESK</p>
				<h1>Make room for<br /><em>what’s next.</em></h1>
				<p class="hero-copy">Run Linux environments and useful web apps side by side, directly from your browser.</p>
			</div>
			<div class="resource-card">
				<p class="eyebrow">HOST CAPACITY</p>
				<div class="resource-row"><span>Processing</span><strong>{hostCores}</strong></div>
				<div class="resource-row"><span>Browser storage</span><strong>{hostStorage}</strong></div>
				<p class="resource-note">XDVM uses browser-managed storage and available WebAssembly threads. Your files stay in this browser profile.</p>
			</div>
		</section>

		<section class="section-block">
			<div class="section-heading"><div><p class="eyebrow">VIRTUAL MACHINES</p><h2>Choose a workspace</h2></div><button class="plus-button" on:click={() => showCreate = !showCreate} aria-label="Create a custom virtual machine" title="Create custom VM">+</button></div>
			<div class="os-grid">
				{#each operatingSystems as os}
					<button class:selected={selectedOs.id === os.id} class="os-card" on:click={() => selectOs(os)}>
						<span class="os-icon" style={`--accent: ${os.accent}`}>{os.name.slice(0, 1)}</span>
						<span class="os-copy"><strong>{os.name}</strong><small>{os.detail}</small></span>
						<span class="os-state">{os.ready ? 'Ready' : 'Add image'}</span>
					</button>
				{/each}
			</div>
			{#if showCreate || !selectedOs.ready}
				<div class="create-panel">
					<div><strong>{selectedOs.name} image</strong><p>Import an `.ext2` root image or any `.iso` for your local library. Images stay in this browser session.</p>{#if imageMessage}<p class="image-message">{imageMessage}</p>{/if}</div>
					<label class="upload-button">{customImageName || 'Choose ISO or EXT2'}<input type="file" accept=".iso,.ext2,application/octet-stream" on:change={handleImage} /></label>
				</div>
			{/if}
			<button class="launch-button" on:click={launch}>{customImageType === 'iso' ? 'ISO imported - conversion required' : selectedOs.ready ? `Launch ${selectedOs.name}` : 'Select an image to launch'} <span>↗</span></button>
		</section>

		<section class="section-block web-apps">
			<div class="section-heading"><div><p class="eyebrow">WEB APPS</p><h2>Useful, one click away</h2></div><span class="app-count">{webApps.length} apps</span></div>
			<div class="app-grid">
				{#each webApps as app}
					<a class="app-card" href={app.url} target="_blank" rel="noreferrer"><span class="app-icon">↗</span><span><strong>{app.name}</strong><small>{app.detail}</small></span></a>
				{/each}
			</div>
		</section>
		<footer><span>XDVM</span><span>Linux in the browser, on your terms.</span><span>Powered by CheerpX</span></footer>
	</main>
{/if}

<style>
	:global(body) { background: #f2efe8; color: #20221f; }
	.launcher { min-height: 100vh; overflow: auto; background: radial-gradient(circle at 90% 5%, #d9e7dd 0, transparent 28%), #f2efe8; font-family: Archivo, sans-serif; }
	.topbar, .hero, .section-block, footer { max-width: 1180px; margin: 0 auto; }
	.topbar { display: flex; justify-content: space-between; align-items: center; padding: 27px 32px; border-bottom: 1px solid #d5d1c7; }
	.brand { display: flex; gap: 10px; align-items: center; font-weight: 800; letter-spacing: .08em; font-size: 18px; }
	.brand-mark { display: grid; place-items: center; width: 30px; height: 30px; background: #1f2925; color: #e4f1e1; border-radius: 50%; }
	.topbar-status { color: #73766f; font-size: 12px; letter-spacing: .03em; }.status-dot { display: inline-block; width: 7px; height: 7px; margin-right: 6px; background: #6eaf76; border-radius: 50%; }.status-divider { display: inline-block; height: 13px; margin: 0 12px -2px; border-left: 1px solid #c4c1b8; }
	.hero { display: grid; grid-template-columns: 1.4fr .8fr; gap: 80px; padding: 88px 32px 75px; }.eyebrow { margin: 0 0 16px; color: #a35e47; font-size: 11px; font-weight: 800; letter-spacing: .16em; }.hero h1 { margin: 0; color: #1f2925; font-size: clamp(48px, 7vw, 88px); line-height: .94; letter-spacing: -.04em; }.hero h1 em { color: #a35e47; font-family: Georgia, serif; font-weight: 400; }.hero-copy { max-width: 450px; margin: 28px 0 0; color: #656960; font-size: 17px; line-height: 1.6; }.resource-card { align-self: end; padding: 22px; border-left: 2px solid #a35e47; background: #e7e2d8; }.resource-row { display: flex; justify-content: space-between; padding: 13px 0; border-bottom: 1px solid #d1cbbf; font-size: 13px; }.resource-row strong { color: #1f2925; }.resource-note { margin: 17px 0 0; color: #77786f; font-size: 11px; line-height: 1.5; }
	.section-block { padding: 0 32px 60px; }.section-heading { display: flex; justify-content: space-between; align-items: end; margin-bottom: 22px; }.section-heading h2 { margin: 0; color: #1f2925; font-size: 25px; letter-spacing: -.02em; }.plus-button { display: grid; place-items: center; width: 42px; height: 42px; border: 1px solid #b8b4a9; border-radius: 50%; background: transparent; color: #a35e47; font-size: 25px; cursor: pointer; }.plus-button:hover { background: #1f2925; color: white; border-color: #1f2925; }.os-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }.os-card, .app-card { border: 1px solid #d3cfc4; background: rgba(255,255,255,.3); cursor: pointer; text-align: left; }.os-card { min-height: 154px; padding: 17px; display: flex; flex-direction: column; justify-content: space-between; }.os-card:hover, .os-card.selected { border-color: #a35e47; background: #fffdf8; box-shadow: 0 5px 0 #a35e47; }.os-icon { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; background: var(--accent); color: white; font-size: 19px; font-weight: 800; }.os-copy { display: flex; flex-direction: column; gap: 4px; }.os-copy strong, .app-card strong { color: #252a25; font-size: 14px; }.os-copy small, .app-card small { color: #77786f; font-size: 11px; }.os-state { color: #9d6551; font-size: 10px; text-transform: uppercase; letter-spacing: .1em; }.create-panel { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-top: 18px; padding: 18px; background: #e7e2d8; }.create-panel p { margin: 5px 0 0; color: #77786f; font-size: 12px; }.upload-button { padding: 11px 15px; border: 1px solid #a35e47; color: #8c4e3c; font-size: 12px; cursor: pointer; white-space: nowrap; }.upload-button input { display: none; }.launch-button { width: 100%; margin-top: 18px; padding: 16px; border: 0; background: #1f2925; color: #f1eee5; font-size: 13px; font-weight: 700; letter-spacing: .04em; cursor: pointer; }.launch-button:hover { background: #a35e47; }.launch-button span { margin-left: 8px; }.web-apps { padding-top: 8px; }.app-count { color: #797a72; font-size: 12px; }.app-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }.app-card { display: flex; gap: 14px; align-items: center; padding: 18px; text-decoration: none; }.app-card:hover { border-color: #a35e47; background: #fffdf8; }.app-card span:last-child { display: flex; flex-direction: column; gap: 5px; }.app-icon { display: grid; place-items: center; width: 32px; height: 32px; background: #dce7dd; color: #486d54; }.vm-shell { height: 100vh; background: #000; }.back-button { position: fixed; z-index: 20; top: 8px; right: 12px; padding: 5px 9px; border: 1px solid #666; background: #222; color: #ddd; font-size: 12px; cursor: pointer; }.back-button span { margin-left: 4px; }
	footer { display: flex; justify-content: space-between; padding: 28px 32px; border-top: 1px solid #d5d1c7; color: #85867d; font-size: 11px; letter-spacing: .03em; }
	.image-message { max-width: 620px; color: #9a5845 !important; }
	@media (max-width: 800px) { .topbar, .hero, .section-block, footer { padding-left: 20px; padding-right: 20px; }.hero { grid-template-columns: 1fr; gap: 35px; padding-top: 55px; }.os-grid { grid-template-columns: repeat(2, 1fr); }.app-grid { grid-template-columns: 1fr; }.create-panel, footer { align-items: flex-start; flex-direction: column; }.topbar-status { display: none; } }
</style>
