"use strict";

// Import parts of electron to use
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const url = require("url");
const { spawn } = require("child_process");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// Keep a reference for dev mode
let dev = false;
if (
	process.defaultApp ||
	/[\\/]electron-prebuilt[\\/]/.test(process.execPath) ||
	/[\\/]electron[\\/]/.test(process.execPath)
) {
	dev = true;
}

function createWindow() {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 250,
		height: 350,
		show: false,
		frame: false,
		resizable: false
	});

	mainWindow.setMenu(null);

	// and load the index.html of the app.
	let indexPath;
	if (dev && process.argv.indexOf("--noDevServer") === -1) {
		indexPath = url.format({
			protocol: "http:",
			host: "localhost:8080",
			pathname: "index.html",
			slashes: true
		});
	} else {
		indexPath = url.format({
			protocol: "file:",
			pathname: path.join(__dirname, "dist", "index.html"),
			slashes: true
		});
	}
	mainWindow.loadURL(indexPath);

	// Don't show until we are ready and loaded
	mainWindow.once("ready-to-show", () => {
		mainWindow.show();
		// Open the DevTools automatically if developing
		if (dev) {
			mainWindow.webContents.openDevTools();
		}
	});

	// Emitted when the window is closed.
	mainWindow.on("closed", function() {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});

	getJobLocation();
}

function getJobLocation() {
	const arg1 = process.argv[1]; // "sfphq-xppsrv01/XPP/SFP/alljobz/CLS_training/GRP_brandon/JOB_s001334x1_training"

	let path = arg1.split("/");
	path = path.slice(4, path.length);
	path = path.join("\\");

	global.jobLocation = "N:\\" + path; //"N:\\SFP\\alljobz\\CLS_training\\GRP_brandon\\JOB_s001334x1_training"
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
	// On macOS it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) {
		createWindow();
	}
});

ipcMain.on("print-pdf", function(event, TYPE, LOCATION) {
	const print_format = {
		clean: `psfmtdrv -job -nhdr -df ${LOCATION} -pn ${TYPE} -pdfmark -distill -pdfusegs -efd1 -frames`,
		marked: `psfmtdrv -job -nhdr -df ${LOCATION} -pn ${TYPE} -pdfmark -distill -pdfusegs -efd1 -frames -mkta 0`,
		markedCPO: `cap psfmtdrv -job -nhdr -cap -df ${LOCATION} -pn ${TYPE} -pdfmark -distill -pdfusegs -efd1 -frames -mkta 0`,
		cumulative: `psfmtdrv -job -nhdr -df ${LOCATION} -pn ${TYPE} -pdfmark -distill -pdfusegs -efd1 -frames -mkta baseline`
	};

	console.log(`Processing: ${print_format[TYPE]}`);

	// const ls = spawn("balls", [], {
	// 	cwd: global.jobLocation
	// });

	let ls = spawn(print_format[TYPE], [], { shell: true, cwd: global.jobLocation });

	console.log(global.jobLocation);

	ls.stdout.on("data", data => {
		event.sender.send("printed", `stdout: ${data}`);
	});

	ls.stderr.on("data", data => {
		console.log(`stderr: ${data}`);
	});
});
