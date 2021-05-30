const { app, BrowserWindow, } = require('electron');

function createWindow() {
    let width = 1000;
    let height = 400;

    win = new BrowserWindow({
        width,
        height,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            backgroundThrottling: false
        }
    });
    win.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow()
})