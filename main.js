const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const url = require("url");
const { spawn } = require("child_process");

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

global.dev = dev;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 250,
		height: 350,
		show: false,
		frame: false,
		resizable: false
	});

	mainWindow.setMenu(null);

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

	mainWindow.once("ready-to-show", () => {
		mainWindow.show();
		if (dev) {
			mainWindow.webContents.openDevTools();
		}
	});

	mainWindow.on("closed", function() {
		mainWindow = null;
	});

	getJobLocation();
}

function getJobLocation() {
	let arg1;

	if (dev) {
		arg1 = "//sfphq-xppsrv01/XPP/SFP/alljobz/CLS_training/GRP_brandon/JOB_s001337x1_pom";
	} else {
		arg1 = process.argv[1]; //PROD: Use passed argv from XPP
	}

	let path = arg1.split("/");
	path = path.slice(4, path.length);

	global.jobNumber = path[path.length - 1];
	path = path.join("\\");
	global.jobLocation = "N:\\" + path; //"N:\\SFP\\alljobz\\CLS_training\\GRP_brandon\\JOB_s001334x1_training"
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (mainWindow === null) {
		createWindow();
	}
});

ipcMain.on("print-pdf", (event, TYPE, LOCATION, NAME, LEVEL) => {
	if (NAME == null) NAME = `${global.jobNumber}_${TYPE}_${Math.floor(Math.random() * 1010)}`;

	const print_format = {
		clean: `psfmtdrv -job -nhdr -df ${LOCATION} -pn ${NAME} -pdfmark -distill -pdfusegs -efd1 -frames`,
		marked: `psfmtdrv -job -nhdr -df ${LOCATION} -pn ${NAME} -pdfmark -distill -pdfusegs -efd1 -frames -mkta 0`,
		markedCPO: `cap psfmtdrv -job -nhdr -cap -df ${LOCATION} -pn ${NAME} -pdfmark -distill -pdfusegs -efd1 -frames -mkta 0`,
		cumulative: `psfmtdrv -job -nhdr -df ${LOCATION} -pn ${NAME} -pdfmark -distill -pdfusegs -efd1 -frames -mkta baseline`,
		marklvl: `psfmtdrv -job -nhdr -df ${LOCATION} -pn ${NAME} -pdfmark -distill -pdfusegs -efd1 -frames -mkta ${LEVEL}`
	};

	if (TYPE == "cpolvl") return;

	if (dev) {
		console.log(`Processing: ${print_format[TYPE]}`);

		let ls = spawn("ping 127.1.0.0", [], { shell: true });

		ls.on("close", function() {
			event.sender.send("proof_made", TYPE);
		});
	}

	//PROD: Create PDF files
	if (!dev) {
		let ls = spawn(print_format[TYPE], [], { shell: true, cwd: global.jobLocation });

		ls.stdout.on("data", data => {
			event.sender.send("printed", `stdout: ${data}`);
		});

		ls.stderr.on("data", data => {
			console.log(`stderr: ${data}`);
		});

		ls.on("close", function() {
			event.sender.send("proof_made", TYPE);
		});
	}
});

ipcMain.on("set-level", function(event) {
	//TODO: Create set-level logic
});
