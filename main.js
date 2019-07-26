const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("path");
const url = require("url");
const { spawn } = require("child_process");

let mainWindow;

// Keep a reference for dev mode
let dev = false;
if (process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath)) {
	dev = true;
}

global.dev = dev;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 450,
		height: 550,
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
	});

	mainWindow.on("closed", function() {
		mainWindow = null;
	});

	getJobLocation();
}

function getJobLocation() {
	let arg1;

	if (dev) {
		arg1 = "//sfphq-xppsrv01/XPP/SFP/alljobz/CLS_training/GRP_brandon/JOB_s001337x1_pom_print_deez";
	} else {
		arg1 = process.argv[1]; //PROD: Use passed argv from XPP
	}

	let path = arg1.split("/");
	path = path.slice(4, path.length);

	global.jobNumber = path[path.length - 1];
	path = path.join("\\");
	global.jobLocation = "N:\\" + path; //"N:\\SFP\\alljobz\\CLS_training\\GRP_brandon\\JOB_s001334x1_training"
}

app.on("ready", () => {
	createWindow();
	globalShortcut.register("Control+`", () => {
		mainWindow.webContents.openDevTools({ mode: "detach" });
	});
});

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

ipcMain.on("print-pdf", (event, TYPE, LOCATION, NAME, LEVEL, isAlone) => {
	if (NAME == null) NAME = `${global.jobNumber}_${TYPE}_${Math.floor(Math.random() * 1010)}`;

	const print_format = {
		clean: `psfmtdrv -job -nhdr -df ${LOCATION} -pn ${NAME} -pdfmark -distill -pdfusegs -efd1 -frames`,
		marked: `psfmtdrv -job -nhdr -df ${LOCATION} -pn ${NAME} -pdfmark -distill -pdfusegs -efd1 -frames -mkta 0`,
		markedCPO: `cap psfmtdrv -job -nhdr -cap -df ${LOCATION} -pn ${NAME} -pdfmark -distill -pdfusegs -efd1 -frames -mkta 0`,
		cumulative: `psfmtdrv -job -nhdr -df ${LOCATION} -pn ${NAME} -pdfmark -distill -pdfusegs -efd1 -frames -mkta baseline`,
		marklvl: `psfmtdrv -job -nhdr -df ${LOCATION} -pn ${NAME} -pdfmark -distill -pdfusegs -efd1 -frames -mkta ${LEVEL}`
	};

	if (TYPE == "cpolvl" && isAlone) {
		event.sender.send("make_cpo_lvl", "cpolvl", LOCATION, NAME);
		return;
	}

	if (TYPE == "cpolvl") {
		return;
	}

	event.sender.send("debug", `Processing: ${print_format[TYPE]}`);

	if (dev) {
		let ls = spawn("ping 127.1.0.0", [], { shell: true });

		ls.stderr.on("data", data => {
			event.sender.send("debug", `${TYPE} Error: ${data}`);
			event.sender.send("proof_made", data, true);
		});

		ls.on("close", code => {
			if (code == 0) event.sender.send("proof_made", TYPE, false);
		});
	}

	//PROD: Create PDF files
	if (!dev) {
		let ls = spawn(print_format[TYPE], [], { shell: true, cwd: global.jobLocation });

		ls.stderr.on("data", data => {
			event.sender.send("debug", `${TYPE} Error: ${data}`);
			event.sender.send("proof_made", data, true);
		});

		ls.stdout.on("data", data => {
			event.sender.send("debug", data.toString());
		});

		ls.on("close", code => {
			if (code == 0) event.sender.send("proof_made", TYPE, false);
		});
	}
});

ipcMain.on("set-level", (event, LOCATION, NAME, LEVEL) => {
	event.sender.send("debug", `CURRENT LOCATION: ${LOCATION}`);

	let sfp, baseline, print, restore, deleteTemp;

	//Copy baseline from SFP into TempBaseline Folder
	sfp = spawn(`xcopy ${global.jobLocation}\\*Tbaseline "N:\\TempBaseline\\${global.jobNumber}" /e /i`, [], {
		shell: true,
		cwd: global.jobLocation
	});

	sfp.stdin.write("a");

	// xcopy N:\SFP\alljobz\CLS_training\GRP_brandon\JOB_s001955x3_fake\*Tbaseline  N:\TempBaseline\s001955x3 /e /i

	sfp.on("close", data => {
		sfp.stdin.end();
		event.sender.send("debug", `Restoring level: ${LEVEL}`);

		baseline = spawn(`xcopy ${global.jobNumber.substring(4)}_Level${LEVEL}\\*Tbaseline "${global.jobLocation}" /e /i /u`, [], {
			shell: true,
			cwd: "M:\\BaselineBackup"
		});

		baseline.stderr.on("data", data => {
			event.sender.send("proof_made", `Error restoring level: ${data}`, true);
		});

		baseline.stdout.on("data", data => {
			event.sender.send("debug", data.toString());
		});

		baseline.stdin.write("a");

		baseline.on("close", code => {
			baseline.stdin.end();
			if (code == 0) {
				event.sender.send("debug", `Level ${LEVEL} sucessfully restored.`);

				print = spawn(`cap psfmtdrv -job -nhdr -cap -df ${LOCATION} -pn ${NAME} -pdfmark -distill -pdfusegs -efd1 -frames -mkta ${LEVEL}`, [], { shell: true, cwd: global.jobLocation });

				print.stderr.on("data", data => {
					event.sender.send("debug", `Error: ${data}`);
					return;
				});

				print.stdout.on("data", data => {
					event.sender.send("debug", data.toString());
				});

				print.on("close", code => {
					restore = spawn(`xcopy N:\\TempBaseline\\${global.jobNumber}\\*Tbaseline "${global.jobLocation}" /e /i /u`, [], {
						shell: true,
						cwd: "N:\\TempBaseline"
					});

					restore.stdout.on("data", data => {
						event.sender.send("debug", data.toString());
					});

					restore.stderr.on("data", data => {
						event.sender.send("debug", `Error: ${data}`);
						return;
					});

					restore.stdin.write("a");

					restore.on("close", code => {
						restore.stdin.end();
						deleteTemp = spawn(`RMDIR N:\\TempBaseline\\${global.jobNumber} /Q /S`, [], {
							shell: true,
							cwd: "N:\\TempBaseline"
						});

						deleteTemp.stdout.on("data", data => {
							event.sender.send("debug", data.toString());
						});

						deleteTemp.stderr.on("data", data => {
							event.sender.send("debug", `Error: ${data}`);
							return;
						});

						deleteTemp.on("close", code => {
							event.sender.send("proof_made", data, false);
							event.sender.send("debug", `Printing PDFs completed.`);
							return;
						});
					});
				});

				event.sender.send("debug", `Processing: cap psfmtdrv -job -nhdr -cap -df ${LOCATION} -pn ${NAME} -pdfmark -distill -pdfusegs -efd1 -frames -mkta ${LEVEL}`);
			} else {
				console.log("DONE BUT WITH CODE: " + code);
			}
		});
	});

	sfp.stderr.on("data", data => {
		event.sender.send("proof_made", `Error copying baseline to temp: ${data}`, true);
		return;
	});

	sfp.stdout.on("data", data => {
		event.sender.send("debug", data.toString());
	});
});

ipcMain.on("compose", event => {
	let ls = spawn(`jobcomp -xsh -xref -job -s`, [], { shell: true, cwd: global.jobLocation });

	event.sender.send("debug", `Composing job...`);

	ls.stderr.on("data", data => {
		event.sender.send("debug", `Error: ${data}`);
	});

	ls.stdout.on("data", data => {
		event.sender.send("debug", data.toString());
	});

	ls.on("close", code => {
		if (code == 0) event.sender.send("debug", `Compose done`);
		event.sender.send("compose-reply");
	});
});
