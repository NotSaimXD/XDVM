const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('xdvmNative', {
	getHost: () => ipcRenderer.invoke('native:get-host'),
	pickImage: () => ipcRenderer.invoke('native:pick-image'),
	launch: (request) => ipcRenderer.invoke('native:launch', request)
});