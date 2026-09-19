const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('node:path');
const { getHostCapabilities, startVm, getVmStatus, stopVm, stopAllVms } = require('./qemu.cjs');

function nativeResourcesPath() {
	return app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'resources');
}

function createWindow() {
	const window = new BrowserWindow({
		width: 1280,
		height: 820,
		minWidth: 980,
		minHeight: 640,
		backgroundColor: '#f5f7f6',
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			preload: path.join(__dirname, 'preload.cjs')
		}
	});

	window.loadFile(path.join(__dirname, '..', 'build', 'index.html'));
}

ipcMain.handle('native:get-host', () => getHostCapabilities(nativeResourcesPath()));

ipcMain.handle('native:pick-image', async () => {
	const result = await dialog.showOpenDialog({
		properties: ['openFile'],
		filters: [{ name: 'Android and VM images', extensions: ['iso', 'img', 'raw', 'qcow', 'qcow2', 'vmdk', 'vdi'] }]
	});
	if (result.canceled || result.filePaths.length === 0) return null;
	const filePath = result.filePaths[0];
	return { path: filePath, name: path.basename(filePath), imageType: path.extname(filePath).toLowerCase() === '.iso' ? 'iso' : 'disk' };
});

ipcMain.handle('native:launch', (_event, request) => startVm({ ...request, resourcesPath: nativeResourcesPath() }));
ipcMain.handle('native:vm-status', (_event, pid) => getVmStatus(pid));
ipcMain.handle('native:stop', (_event, pid) => stopVm(pid));

app.whenReady().then(() => {
	createWindow();
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on('window-all-closed', () => {
	stopAllVms();
	if (process.platform !== 'darwin') app.quit();
});