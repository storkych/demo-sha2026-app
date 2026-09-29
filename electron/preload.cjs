const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('questStorage', { read: () => ipcRenderer.invoke('progress:read'), write: value => ipcRenderer.invoke('progress:write', value) });
