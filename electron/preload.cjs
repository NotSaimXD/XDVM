const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('xdvmNative', {
	getHost: () => ipcRenderer.invoke('native:get-host'),
	pickImage: () => ipcRenderer.invoke('native:pick-image'),
	launch: (request) => ipcRenderer.invoke('native:launch', request),
	getVmStatus: (pid) => ipcRenderer.invoke('native:vm-status', pid),
	stop: (pid) => ipcRenderer.invoke('native:stop', pid)
});