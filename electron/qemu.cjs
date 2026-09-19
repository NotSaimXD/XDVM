const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const runningVms = new Map();

const DEVICE_PROFILES = {
	quiet: { label: 'Quiet', memory: 2048, cores: 2 },
	balanced: { label: 'Balanced', memory: 4096, cores: 4 },
	workstation: { label: 'Workstation', memory: 8192, cores: 6 },
	android: { label: 'Android Fast', memory: 4096, cores: 4, android: true, graphics: 'virtio-gpu' }
};

function getDeviceProfile(name, host) {
	if (DEVICE_PROFILES[name]) return DEVICE_PROFILES[name];
	if (host.totalMemory >= 16 * 1024 && host.cores >= 8) return DEVICE_PROFILES.workstation;
	if (host.totalMemory >= 8 * 1024 && host.cores >= 4) return DEVICE_PROFILES.balanced;
	return DEVICE_PROFILES.quiet;
}

function commandOnPath(command) {
	const lookup = process.platform === 'win32' ? 'where.exe' : 'which';
	const result = spawnSync(lookup, [command], { encoding: 'utf8', windowsHide: true });
	return result.status === 0 ? result.stdout.trim().split(/\r?\n/)[0] : null;
}

function findQemu(resourcesPath) {
	const executable = process.platform === 'win32' ? 'qemu-system-x86_64.exe' : 'qemu-system-x86_64';
	const bundled = [
		path.join(resourcesPath, 'qemu', executable),
		path.join(process.resourcesPath || '', 'qemu', executable),
		path.join(__dirname, '..', 'resources', 'qemu', executable)
	];
	return bundled.find((candidate) => fs.existsSync(candidate)) || commandOnPath(executable);
}

function getHostCapabilities(resourcesPath) {
	const cores = Math.max(1, os.cpus().length);
	const totalMemory = Math.floor(os.totalmem() / 1024 / 1024);
	const kvmPath = '/dev/kvm';
	const kvm = process.platform === 'linux' && fs.existsSync(kvmPath) && (() => {
		try {
			fs.accessSync(kvmPath, fs.constants.R_OK | fs.constants.W_OK);
			return true;
		} catch {
			return false;
		}
	})();
	return {
		platform: process.platform,
		arch: process.arch,
		cores,
		totalMemory,
		kvm,
		qemuPath: findQemu(resourcesPath),
		profiles: DEVICE_PROFILES
	};
}

function getDiskFormat(imagePath) {
	const extension = path.extname(imagePath).toLowerCase();
	if (extension === '.qcow2' || extension === '.qcow') return 'qcow2';
	if (extension === '.vmdk') return 'vmdk';
	if (extension === '.vdi') return 'vdi';
	return 'raw';
}

function buildQemuArgs({ imagePath, imageType, imageFormat, profileName, host }) {
	const profile = getDeviceProfile(profileName, host);
	const args = [
		'-name', 'XDVM',
		'-machine', 'q35',
		'-m', String(profile.memory),
		'-smp', String(Math.min(profile.cores, host.cores)),
		'-nic', 'user,model=virtio',
		'-device', profile.android ? 'virtio-gpu-pci' : 'virtio-vga',
		'-display', 'default'
	];
	if (profile.android) {
		args.push('-device', 'virtio-tablet-pci', '-device', 'virtio-keyboard-pci', '-rtc', 'base=localtime', '-global', 'ICH9-LPC.disable_s3=1', '-global', 'ICH9-LPC.disable_s4=1');
	}

	if (host.kvm) {
		args.push('-accel', 'kvm', '-cpu', 'host');
	} else {
		args.push('-accel', 'tcg,thread=multi', '-cpu', 'max');
	}

	if (imageType === 'iso') {
		args.push('-cdrom', imagePath, '-boot', 'order=d');
	} else {
		args.push('-drive', `file=${imagePath},format=${imageFormat || getDiskFormat(imagePath)},if=virtio`);
	}
	return { args, profile };
}

function startVm({ imagePath, imageType, profileName, resourcesPath }) {
	if (!path.isAbsolute(imagePath) || !fs.existsSync(imagePath)) {
		throw new Error('The selected VM image is not available on this device.');
	}
	const host = getHostCapabilities(resourcesPath);
	if (!host.qemuPath) {
		throw new Error('QEMU was not found. Add qemu-system-x86_64 to the bundled qemu folder or install it on the host.');
	}
	const { args, profile } = buildQemuArgs({ imagePath, imageType, profileName, host });
	const child = spawn(host.qemuPath, args, { detached: false, stdio: 'ignore', windowsHide: true });
	runningVms.set(child.pid, child);
	child.once('exit', () => runningVms.delete(child.pid));
	child.unref();
	return { pid: child.pid, accelerator: host.kvm ? 'KVM' : 'TCG', graphics: profile.graphics || 'virtio-vga', profile: profile.label };
}

function getVmStatus(pid) {
	const child = runningVms.get(pid);
	return { pid, running: Boolean(child && !child.killed) };
}

function stopVm(pid) {
	const child = runningVms.get(pid);
	if (!child) return { pid, stopped: false };
	child.kill();
	runningVms.delete(pid);
	return { pid, stopped: true };
}

function stopAllVms() {
	for (const child of runningVms.values()) child.kill();
	runningVms.clear();
}

module.exports = { DEVICE_PROFILES, getHostCapabilities, getDiskFormat, buildQemuArgs, startVm, getVmStatus, stopVm, stopAllVms };