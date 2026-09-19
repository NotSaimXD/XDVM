<script>
	import { onMount, onDestroy } from 'svelte';
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
	let nativeHost = null;
	let nativeMode = false;
	let nativeProfile = 'balanced';
	let nativeMemory = 4096;
	let nativeCores = 4;
	let nativeImage = null;
	let nativeStatus = '';
	let nativeError = '';
	let nativeVm = null;
	let showRecorder = false;
	let recording = false;
	let recordingPaused = false;
	let recordAudio = false;
	let recordSeconds = 0;
	let mediaRecorder = null;
	let recordStream = null;
	let recordChunks = [];
	let recordTimer = null;
	let themeMode = 'system';
	let isDarkTheme = false;
	let themeMediaQuery = null;

	onMount(async () => {
		themeMode = localStorage.getItem('xdvm-theme') || 'system';
		themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		applyTheme();
		themeMediaQuery.addEventListener('change', applyTheme);
		hostCores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} logical cores` : 'Unavailable';
		if (window.xdvmNative) {
			nativeHost = await window.xdvmNative.getHost();
			nativeProfile = nativeHost.cores >= 8 && nativeHost.totalMemory >= 16384 ? 'workstation' : nativeHost.cores >= 4 && nativeHost.totalMemory >= 8192 ? 'balanced' : 'quiet';
			const savedHardware = JSON.parse(localStorage.getItem('xdvm-hardware') || '{}');
			nativeProfile = savedHardware.profile || nativeProfile;
			nativeMemory = savedHardware.memory || nativeHost.profiles[nativeProfile]?.memory || 4096;
			nativeCores = savedHardware.cores || nativeHost.profiles[nativeProfile]?.cores || 4;
			hostCores = `${nativeHost.cores} logical cores`;
		}
		if (navigator.storage?.estimate) {
			const estimate = await navigator.storage.estimate();
			const available = estimate.quota ? `${Math.round(estimate.quota / 1073741824)} GB browser quota` : 'Available';
			hostStorage = available;
		} else {
			hostStorage = 'Unavailable';
		}
	});

	function applyTheme() {
		isDarkTheme = themeMode === 'dark' || (themeMode === 'system' && themeMediaQuery?.matches);
	}

	function setTheme(mode) {
		themeMode = mode;
		localStorage.setItem('xdvm-theme', mode);
		applyTheme();
	}

	function selectNativeProfile(event) {
		nativeProfile = event.currentTarget.value;
		const profile = nativeHost.profiles[nativeProfile];
		if (nativeProfile !== 'custom' && profile) {
			nativeMemory = profile.memory;
			nativeCores = profile.cores;
		}
		localStorage.setItem('xdvm-hardware', JSON.stringify({ profile: nativeProfile, memory: nativeMemory, cores: nativeCores }));
	}

	function formatRecordingTime(seconds) {
		const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
		const remainder = (seconds % 60).toString().padStart(2, '0');
		return `${minutes}:${remainder}`;
	}

	async function startRecording() {
		if (!navigator.mediaDevices?.getDisplayMedia || !window.MediaRecorder) return;
		try {
			recordStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: recordAudio });
			const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type));
			mediaRecorder = new MediaRecorder(recordStream, mimeType ? { mimeType } : undefined);
			recordChunks = [];
			recordSeconds = 0;
			mediaRecorder.ondataavailable = (event) => event.data.size > 0 && recordChunks.push(event.data);
			mediaRecorder.onstop = () => {
				const blob = new Blob(recordChunks, { type: mediaRecorder.mimeType || 'video/webm' });
				const url = URL.createObjectURL(blob);
				const link = document.createElement('a');
				link.href = url;
				link.download = `xdvm-recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
				link.click();
				URL.revokeObjectURL(url);
				recordChunks = [];
			};
			recordStream.getVideoTracks()[0].addEventListener('ended', stopRecording);
			mediaRecorder.start(1000);
			recording = true;
			recordingPaused = false;
			recordTimer = setInterval(() => recordSeconds += 1, 1000);
		} catch (error) {
			nativeError = error.name === 'NotAllowedError' ? 'Screen sharing was cancelled.' : `Recording could not start: ${error.message}`;
		}
	}

	function toggleRecordingPause() {
		if (!mediaRecorder) return;
		if (mediaRecorder.state === 'recording') {
			mediaRecorder.pause();
			recordingPaused = true;
		} else if (mediaRecorder.state === 'paused') {
			mediaRecorder.resume();
			recordingPaused = false;
		}
	}

	function stopRecording() {
		if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
		mediaRecorder.stop();
		recordStream?.getTracks().forEach((track) => track.stop());
		clearInterval(recordTimer);
		recordTimer = null;
		recording = false;
		recordingPaused = false;
		mediaRecorder = null;
		recordStream = null;
	}

	onDestroy(() => {
		themeMediaQuery?.removeEventListener('change', applyTheme);
		if (mediaRecorder?.state !== 'inactive') mediaRecorder?.stop();
		recordStream?.getTracks().forEach((track) => track.stop());
		clearInterval(recordTimer);
	});

	function selectOs(os) {
		selectedOs = os;
		showCreate = false;
	}

	async function chooseNativeImage() {
		nativeError = '';
		nativeImage = await window.xdvmNative.pickImage();
	}

	async function stopNativeVm() {
		if (!nativeVm) return;
		await window.xdvmNative.stop(nativeVm.pid);
		nativeStatus = 'Native VM stopped.';
		nativeVm = null;
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

	async function launch() {
		if (nativeMode) {
			if (!nativeImage) {
				nativeError = 'Choose an ISO or raw disk image before launching.';
				return;
			}
			try {
				localStorage.setItem('xdvm-hardware', JSON.stringify({ profile: nativeProfile, memory: nativeMemory, cores: nativeCores }));
				const result = await window.xdvmNative.launch({ imagePath: nativeImage.path, imageType: nativeImage.imageType, imageFormat: nativeImage.imageFormat, profileName: nativeProfile, memory: nativeMemory, cores: nativeCores });
				nativeStatus = `${result.profile} profile started with ${result.memory} MB and ${result.cores} vCPU using ${result.accelerator}.`;
				nativeVm = result;
				nativeError = '';
			} catch (error) {
				nativeError = error.message;
			}
			return;
		}
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
	<meta name="description" content="XDVM is a hybrid Linux workspace with browser virtualization and native QEMU/KVM desktop VMs." />
</svelte:head>

{#if launchedConfig}
	<div class="vm-shell">
		<button class="back-button" on:click={resetLauncher} aria-label="Return to XDVM launcher">← <span>XDVM launcher</span></button>
		<WebVM configObj={launchedConfig} cacheId={`blocks_${launchedOs.id}`}>
			<p>Running {launchedOs.name}. <button class="underline" on:click={resetLauncher}>Return to launcher</button></p>
		</WebVM>
	</div>
{:else}
			<main class:theme-dark={isDarkTheme} class="launcher">
		<header class="topbar">
			<div class="brand"><span class="brand-mark">X</span><span>XDVM</span></div>
			<div class="topbar-actions">
				<div class="topbar-status"><span class="status-dot"></span> Browser virtualization <span class="status-divider"></span> {hostCores}</div>
				<div class="theme-switch" role="group" aria-label="Appearance mode">
					<button class:active={themeMode === 'light'} on:click={() => setTheme('light')}>Light</button>
					<button class:active={themeMode === 'dark'} on:click={() => setTheme('dark')}>Dark</button>
					<button class:active={themeMode === 'system'} on:click={() => setTheme('system')}>System</button>
				</div>
				<button class:recording={recording} class="record-toggle" on:click={() => showRecorder = !showRecorder} aria-label="Open recorder">{recording ? 'REC ' + formatRecordingTime(recordSeconds) : 'Record'}</button>
			</div>
		</header>
		{#if showRecorder}
			<section class="recorder-panel" aria-label="XDVM recorder">
				<div><p class="eyebrow">CAPTURE STUDIO</p><strong>{recording ? (recordingPaused ? 'Recording paused' : 'Recording screen') : 'Record your workspace'}</strong><p class="recorder-note">Choose a screen or window in the system picker, then save a WebM recording when you stop.</p></div>
				<div class="recorder-controls">
					{#if !recording}<label class="audio-toggle"><input type="checkbox" bind:checked={recordAudio} /> Include audio</label>{/if}
					{#if recording}<span class="record-time">{formatRecordingTime(recordSeconds)}</span><button class="recorder-button" on:click={toggleRecordingPause}>{recordingPaused ? 'Resume' : 'Pause'}</button><button class="recorder-button stop" on:click={stopRecording}>Stop & save</button>{:else}<button class="recorder-button start" on:click={startRecording}>Start recording</button>{/if}
				</div>
			</section>
		{/if}

		<section class="hero">
			<div>
				<p class="eyebrow">XDVM WORKSPACE</p>
				<h1>Your virtual<br /><em>machines.</em></h1>
				<p class="hero-copy">Pick an operating system, review its resources, and launch your workspace.</p>
			</div>
			<div class="resource-card">
				<p class="eyebrow">HOST CAPACITY</p>
				<div class="resource-row"><span>Processing</span><strong>{hostCores}</strong></div>
				<div class="resource-row"><span>Browser storage</span><strong>{hostStorage}</strong></div>
				<p class="resource-note">XDVM uses browser-managed storage and available WebAssembly threads. Your files stay in this browser profile.</p>
				{#if nativeHost}
					<div class="runtime-control">
						<p class="eyebrow">RUNTIME</p>
						<div class="runtime-switch" role="group" aria-label="Runtime">
							<button class:active={!nativeMode} on:click={() => nativeMode = false}>Browser</button>
							<button class:active={nativeMode} disabled={!nativeHost.qemuPath} on:click={() => nativeMode = true}>Native QEMU</button>
						</div>
						<p class="runtime-note">{nativeHost.qemuPath ? `QEMU ready: ${nativeHost.qemuPath}` : 'QEMU is not installed or bundled on this device.'}</p>
						{#if nativeMode}
							<label class="profile-select">Device profile
								<select value={nativeProfile} on:change={selectNativeProfile}>
									{#each Object.entries(nativeHost.profiles) as [id, profile]}
										<option value={id}>{profile.label} · {profile.memory} MB / {profile.cores} cores</option>
									{/each}
								</select>
							</label>
							<div class="hardware-grid">
								<label>Memory (MB)<input type="number" min="512" step="512" bind:value={nativeMemory} /></label>
								<label>vCPU cores<input type="number" min="1" max={nativeHost.cores} bind:value={nativeCores} /></label>
							</div>
							<p class="runtime-note">{nativeProfile === 'android' ? 'Runs Android x86 or x86_64 images without Android Studio. Virtio GPU, tablet input, and low-power sleep settings are enabled for integrated graphics.' : nativeHost.kvm ? 'KVM acceleration is available on this host.' : 'KVM is unavailable; QEMU will use multi-threaded TCG.'}</p>
							<button class="image-picker" on:click={chooseNativeImage}>{nativeImage?.name || (nativeProfile === 'android' ? 'Choose Android ISO, IMG, QCOW2, VMDK, or VDI' : 'Choose ISO or disk image')}</button>
							{#if nativeStatus}<p class="native-status">{nativeStatus}</p>{/if}
							{#if nativeVm}<button class="vm-stop" on:click={stopNativeVm}>Stop native VM · PID {nativeVm.pid}</button>{/if}
							{#if nativeError}<p class="native-error">{nativeError}</p>{/if}
						{/if}
				</div>
				{/if}
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
			<button class="launch-button" on:click={launch}>{nativeMode ? 'Launch native VM' : customImageType === 'iso' ? 'ISO imported - conversion required' : selectedOs.ready ? `Launch ${selectedOs.name}` : 'Select an image to launch'} <span>↗</span></button>
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
	.topbar-actions { display: flex; align-items: center; gap: 18px; }
	.theme-switch { display: flex; gap: 2px; padding: 3px; border: 1px solid #d8e0db; border-radius: 7px; background: #f7faf8; }
	.theme-switch button { padding: 5px 7px; border: 0; border-radius: 5px; background: transparent; color: #68736c; font: inherit; font-size: 10px; cursor: pointer; }
	.theme-switch button.active { background: #235b50; color: #fff; }
	.record-toggle { padding: 8px 12px; border: 1px solid #d8e0db; border-radius: 7px; background: #fff; color: #235b50; font: inherit; font-size: 11px; cursor: pointer; }
	.record-toggle:hover, .record-toggle.recording { border-color: #a35e47; color: #a35e47; }
	.recorder-panel { display: flex; justify-content: space-between; align-items: center; gap: 24px; max-width: 1116px; margin: 18px auto 0; padding: 16px 20px; border: 1px solid #d8e0db; border-radius: 10px; background: #fff; box-shadow: 0 6px 20px rgba(32, 52, 44, .06); }
	.recorder-panel .eyebrow { margin-bottom: 6px; }
	.recorder-panel strong { color: #26332d; font-size: 14px; }
	.recorder-note { margin: 5px 0 0; color: #747c76; font-size: 11px; }
	.recorder-controls { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
	.audio-toggle { display: flex; align-items: center; gap: 7px; margin-right: 8px; color: #68736c; font-size: 11px; white-space: nowrap; }
	.audio-toggle input { accent-color: #347b68; }
	.record-time { min-width: 42px; color: #a35e47; font: 700 12px monospace; }
	.recorder-button { padding: 9px 12px; border: 1px solid #cbd8d1; border-radius: 6px; background: #f7faf8; color: #235b50; font: inherit; font-size: 11px; cursor: pointer; white-space: nowrap; }
	.recorder-button.start { border-color: #347b68; background: #235b50; color: #fff; }
	.recorder-button.stop { border-color: #a35e47; color: #a35e47; }
	.brand { display: flex; gap: 10px; align-items: center; font-weight: 800; letter-spacing: .08em; font-size: 18px; }
	.brand-mark { display: grid; place-items: center; width: 30px; height: 30px; background: #1f2925; color: #e4f1e1; border-radius: 50%; }
	.topbar-status { color: #73766f; font-size: 12px; letter-spacing: .03em; }.status-dot { display: inline-block; width: 7px; height: 7px; margin-right: 6px; background: #6eaf76; border-radius: 50%; }.status-divider { display: inline-block; height: 13px; margin: 0 12px -2px; border-left: 1px solid #c4c1b8; }
	.hero { display: grid; grid-template-columns: 1.4fr .8fr; gap: 80px; padding: 88px 32px 75px; }.eyebrow { margin: 0 0 16px; color: #a35e47; font-size: 11px; font-weight: 800; letter-spacing: .16em; }.hero h1 { margin: 0; color: #1f2925; font-size: clamp(48px, 7vw, 88px); line-height: .94; letter-spacing: -.04em; }.hero h1 em { color: #a35e47; font-family: Georgia, serif; font-weight: 400; }.hero-copy { max-width: 450px; margin: 28px 0 0; color: #656960; font-size: 17px; line-height: 1.6; }.resource-card { align-self: end; padding: 22px; border-left: 2px solid #a35e47; background: #e7e2d8; }.resource-row { display: flex; justify-content: space-between; padding: 13px 0; border-bottom: 1px solid #d1cbbf; font-size: 13px; }.resource-row strong { color: #1f2925; }.resource-note { margin: 17px 0 0; color: #77786f; font-size: 11px; line-height: 1.5; }
	.section-block { padding: 0 32px 60px; }.section-heading { display: flex; justify-content: space-between; align-items: end; margin-bottom: 22px; }.section-heading h2 { margin: 0; color: #1f2925; font-size: 25px; letter-spacing: -.02em; }.plus-button { display: grid; place-items: center; width: 42px; height: 42px; border: 1px solid #b8b4a9; border-radius: 50%; background: transparent; color: #a35e47; font-size: 25px; cursor: pointer; }.plus-button:hover { background: #1f2925; color: white; border-color: #1f2925; }.os-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }.os-card, .app-card { border: 1px solid #d3cfc4; background: rgba(255,255,255,.3); cursor: pointer; text-align: left; }.os-card { min-height: 154px; padding: 17px; display: flex; flex-direction: column; justify-content: space-between; }.os-card:hover, .os-card.selected { border-color: #a35e47; background: #fffdf8; box-shadow: 0 5px 0 #a35e47; }.os-icon { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; background: var(--accent); color: white; font-size: 19px; font-weight: 800; }.os-copy { display: flex; flex-direction: column; gap: 4px; }.os-copy strong, .app-card strong { color: #252a25; font-size: 14px; }.os-copy small, .app-card small { color: #77786f; font-size: 11px; }.os-state { color: #9d6551; font-size: 10px; text-transform: uppercase; letter-spacing: .1em; }.create-panel { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-top: 18px; padding: 18px; background: #e7e2d8; }.create-panel p { margin: 5px 0 0; color: #77786f; font-size: 12px; }.upload-button { padding: 11px 15px; border: 1px solid #a35e47; color: #8c4e3c; font-size: 12px; cursor: pointer; white-space: nowrap; }.upload-button input { display: none; }.launch-button { width: 100%; margin-top: 18px; padding: 16px; border: 0; background: #1f2925; color: #f1eee5; font-size: 13px; font-weight: 700; letter-spacing: .04em; cursor: pointer; }.launch-button:hover { background: #a35e47; }.launch-button span { margin-left: 8px; }.web-apps { padding-top: 8px; }.app-count { color: #797a72; font-size: 12px; }.app-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }.app-card { display: flex; gap: 14px; align-items: center; padding: 18px; text-decoration: none; }.app-card:hover { border-color: #a35e47; background: #fffdf8; }.app-card span:last-child { display: flex; flex-direction: column; gap: 5px; }.app-icon { display: grid; place-items: center; width: 32px; height: 32px; background: #dce7dd; color: #486d54; }.vm-shell { height: 100vh; background: #000; }.back-button { position: fixed; z-index: 20; top: 8px; right: 12px; padding: 5px 9px; border: 1px solid #666; background: #222; color: #ddd; font-size: 12px; cursor: pointer; }.back-button span { margin-left: 4px; }
	footer { display: flex; justify-content: space-between; padding: 28px 32px; border-top: 1px solid #d5d1c7; color: #85867d; font-size: 11px; letter-spacing: .03em; }
	.image-message { max-width: 620px; color: #9a5845 !important; }
	.runtime-control { margin-top: 20px; padding-top: 18px; border-top: 1px solid #d8e0db; }
	.runtime-switch { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; background: #edf1ef; border-radius: 8px; }
	.runtime-switch button { padding: 8px 6px; border: 0; border-radius: 5px; background: transparent; color: #64716b; font: inherit; font-size: 11px; cursor: pointer; }
	.runtime-switch button.active { background: #235b50; color: #fff; }
	.runtime-switch button:disabled { color: #adb6b0; cursor: not-allowed; }
	.profile-select { display: grid; gap: 6px; margin-top: 12px; color: #6c756e; font-size: 11px; }
	.profile-select select { width: 100%; padding: 9px 10px; border: 1px solid #d8e0db; border-radius: 7px; background: #fff; color: #26332d; font: inherit; font-size: 11px; }
	.hardware-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
	.hardware-grid label { display: grid; gap: 5px; color: #6c756e; font-size: 10px; }
	.hardware-grid input { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #d8e0db; border-radius: 7px; background: #fff; color: #26332d; font: inherit; font-size: 11px; }
	.runtime-note, .native-status, .native-error { margin: 10px 0 0; font-size: 11px; line-height: 1.45; }
	.runtime-note { color: #6c756e; }
	.native-status { color: #347b68; }
	.native-error { color: #a35e47; }
	.vm-stop { width: 100%; margin-top: 10px; padding: 9px 10px; border: 1px solid #e0b5a7; border-radius: 7px; background: #fff8f5; color: #a35e47; font: inherit; font-size: 11px; text-align: left; cursor: pointer; }
	.image-picker { width: 100%; margin-top: 12px; padding: 10px; border: 1px dashed #9ab7a8; border-radius: 7px; background: #f7faf8; color: #235b50; font: inherit; font-size: 11px; text-align: left; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.launcher.theme-dark { background: radial-gradient(circle at 90% 5%, #20352f 0, transparent 30%), #111816; color: #e7eee9; }
	.launcher.theme-dark .topbar { border-bottom-color: #2c3c35; }
	.launcher.theme-dark .brand, .launcher.theme-dark .hero h1, .launcher.theme-dark .section-heading h2, .launcher.theme-dark .resource-row strong, .launcher.theme-dark .os-copy strong, .launcher.theme-dark .app-card strong { color: #edf4ef; }
	.launcher.theme-dark .topbar-status, .launcher.theme-dark .hero-copy, .launcher.theme-dark .resource-note, .launcher.theme-dark .os-copy small, .launcher.theme-dark .app-card small, .launcher.theme-dark .app-count { color: #a7b5ac; }
	.launcher.theme-dark .resource-card, .launcher.theme-dark .create-panel, .launcher.theme-dark .os-card, .launcher.theme-dark .app-card, .launcher.theme-dark .recorder-panel { border-color: #30463b; background: #1b2621; box-shadow: 0 8px 22px rgba(0, 0, 0, .2); }
	.launcher.theme-dark .resource-row { border-bottom-color: #304239; }
	.launcher.theme-dark .runtime-control { border-top-color: #304239; }
	.launcher.theme-dark .runtime-switch, .launcher.theme-dark .theme-switch { border-color: #30463b; background: #15201b; }
	.launcher.theme-dark .profile-select select { border-color: #3b5548; background: #15201b; color: #edf4ef; }
	.launcher.theme-dark .hardware-grid input { border-color: #3b5548; background: #15201b; color: #edf4ef; }
	.launcher.theme-dark .image-picker { border-color: #527b67; background: #15201b; color: #9ed0b4; }
	.launcher.theme-dark .recorder-note, .launcher.theme-dark .audio-toggle, .launcher.theme-dark .runtime-note { color: #a7b5ac; }
	.launcher.theme-dark .record-toggle { border-color: #3b5548; background: #1b2621; color: #b5dec4; }
	.launcher.theme-dark footer { border-top-color: #2c3c35; color: #9aa99f; }
	.launcher { background: #edf1ef; }
	.topbar { padding-top: 18px; padding-bottom: 18px; border-bottom-color: #d9dfdc; }
	.brand-mark { background: #235b50; }
	.hero { gap: 48px; padding-top: 48px; padding-bottom: 46px; }
	.hero h1 { font-size: clamp(44px, 6vw, 68px); letter-spacing: -.045em; }
	.hero-copy { margin-top: 20px; font-size: 15px; }
	.resource-card { border: 1px solid #d8e0db; border-left: 3px solid #347b68; border-radius: 12px; background: #fff; box-shadow: 0 12px 30px rgba(32, 52, 44, .06); }
	.section-block { padding-bottom: 42px; }
	.section-heading { margin-bottom: 15px; }
	.section-heading h2 { font-size: 21px; }
	.plus-button { width: 38px; height: 38px; border-radius: 10px; border-color: #347b68; background: #347b68; color: #fff; font-size: 23px; }
	.plus-button:hover { background: #235b50; border-color: #235b50; }
	.os-grid { gap: 12px; }
	.os-card { min-height: 138px; padding: 15px; border-radius: 12px; background: #fff; box-shadow: 0 3px 12px rgba(32, 52, 44, .04); }
	.os-card:hover, .os-card.selected { border-color: #347b68; background: #fff; box-shadow: 0 0 0 2px #347b68; }
	.os-icon { width: 34px; height: 34px; font-size: 16px; }
	.create-panel { border: 1px solid #d8e0db; border-radius: 12px; background: #fff; }
	.upload-button { border-radius: 8px; border-color: #347b68; color: #235b50; }
	.launch-button { width: auto; min-width: 210px; padding: 13px 20px; border-radius: 8px; background: #235b50; }
	.launch-button:hover { background: #347b68; }
	.app-card { border-radius: 10px; background: #fff; box-shadow: 0 3px 12px rgba(32, 52, 44, .04); }
	.app-card:hover { border-color: #347b68; }
	.app-icon { border-radius: 8px; background: #dfeee8; color: #347b68; }
	@media (max-width: 800px) { .topbar, .hero, .section-block, footer { padding-left: 20px; padding-right: 20px; }.hero { grid-template-columns: 1fr; gap: 35px; padding-top: 55px; }.os-grid { grid-template-columns: repeat(2, 1fr); }.app-grid { grid-template-columns: 1fr; }.create-panel, footer { align-items: flex-start; flex-direction: column; }.topbar-status { display: none; }.topbar-actions { gap: 8px; }.theme-switch button { padding-left: 5px; padding-right: 5px; }.recorder-panel { align-items: flex-start; flex-direction: column; margin-left: 20px; margin-right: 20px; }.recorder-controls { flex-wrap: wrap; } }
</style>
