import React, { Component } from "react";
import { ipcRenderer as ipc, remote, shell } from "electron";
import "./global.scss";
import "./style.scss";

import Titlebar from "../components/Titlebar";
import Checkbox from "../components/Checkbox";
import fs from "fs";

import smalltalk from "smalltalk/legacy";

class App extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loading: false,
			results: false,
			clean: true,
			marked: true,
			markedCPO: true,
			cumulative: false,
			marklvl: false,
			cpolvl: false,
			level: "",
			job: "",
			location: "",
			proofs: ["clean", "marked", "markedCPO"]
		};

		this.handleChange = this.handleChange.bind(this);
		this.handleLevel = this.handleLevel.bind(this);
		this.pdfOut = this.pdfOut.bind(this);
		this.overwrite = this.overwrite.bind(this);
		this.createPdf = this.createPdf.bind(this);
		this.loadResults = this.loadResults.bind(this);
		this.openFolder = this.openFolder.bind(this);
		this.getLocation = this.getLocation.bind(this);
	}

	componentDidMount() {
		if (remote.getGlobal("jobNumber") != null) {
			let jobNumber = remote
				.getGlobal("jobNumber")
				.split("_")[1]
				.split("x")[0];

			this.setState({ job: jobNumber });
			this.getLocation();
		}

		let counter = 0;

		ipc.on("proof_made", (event, type) => {
			counter++;
			console.log(type);

			if (this.state.proofs.includes("cpolvl") && type == "markedCPO") {
				console.log("CHANGE THE LEVEL NOW !! ");

				ipc.send("set-level", type, location, name);
			}

			if (counter == this.state.proofs.length) {
				this.setState({ loading: false });
				this.loadResults();
			}
		});
	}

	handleChange(event) {
		let text = event.target.value;
		this.setState({ level: text });
	}

	handleLevel() {
		let level = this.state.level;

		if (level.length < 3 && level.length > 1) {
			level = "0" + level;
			this.setState({ level });
		}
		if (level.length < 2 && level.length > 0) {
			level = "00" + level;
			this.setState({ level });
		}
	}

	toggle(state) {
		let newProofs = [...this.state.proofs];
		let i = newProofs.indexOf(state);

		if (i != -1) {
			newProofs.splice(i, 1);
		} else {
			newProofs.push(state);
		}

		this.setState({ [state]: !this.state[state], proofs: newProofs });
	}

	loadResults() {
		this.setState({ results: true });
	}

	openFolder() {
		shell.openItem(this.state.location);
	}

	getLocation() {
		let jobNumber = remote
			.getGlobal("jobNumber")
			.split("_")[1]
			.split("x")[0];
		let xNumber = remote
			.getGlobal("jobNumber")
			.split("_")[1]
			.split("x")[1];

		//PROD: Use M drive to locate job
		let location;
		if (remote.getGlobal("dev")) {
			location = `C:\\${jobNumber}\\x${xNumber}`;
		} else {
			location = `M:\\${jobNumber}\\x${xNumber}`;
		}
		this.setState({ location });
	}

	refreshWindow() {
		remote.getCurrentWindow().reload();
	}

	overwrite() {
		smalltalk
			.confirm("Overwrite", "Are you sure?")
			.then(() => {
				this.createPdf(true);
			})
			.catch(() => {
				console.log("no");
			});
	}

	pdfOut() {
		let location = "N:\\PDF\\out";
		this.setState({ loading: true });

		this.state.proofs.map(type => {
			ipc.send("print-pdf", type, location, "", this.state.level);
		});
	}

	createPdf(overwrite, companyName) {
		let company;
		let draftNumber = 0;
		let run = false;

		if (typeof companyName == "string") {
			company = companyName;
		}

		let location = this.state.location;

		fs.readdir(location, (err, files) => {
			if (err) return;

			files.forEach(a => {
				if (a.indexOf(".pdf") > -1) run = true;
			});

			if (company !== undefined || run) {
				files.forEach(file => {
					let temp = file.split(".");

					if (temp[1] === "pdf") {
						if (temp[0].split("_").length > 4) {
							if (companyName !== undefined || overwrite) company = temp[0].split("_")[2];

							let tempDraft = temp[0].split("_");
							tempDraft = tempDraft[tempDraft.length - 1].substring(5);

							if (draftNumber < tempDraft) draftNumber = tempDraft;

							if (!overwrite)
								fs.rename(`${location}\\${file}`, `${location}\\Old PDF\\${file}`, err => {
									if (err) {
										console.log(err);
										return;
									}
								});
						}
					}
				});

				if (!overwrite) draftNumber++;

				this.state.proofs.map(type => {
					this.setState({ loading: true });

					name = `${remote.getGlobal("jobNumber").substring(4)}_${company}_${type.charAt(0).toUpperCase() +
						type.slice(1)}_Draft${draftNumber}`;

					if (!fs.existsSync(`${location}\\${name}`)) {
						ipc.send("print-pdf", type, location, name, this.state.level);
					}
				});
			} else {
				console.log("NEED COMPANY NAME");

				smalltalk
					.prompt("No PDFs found", "Enter company's name", "")
					.then(value => {
						this.createPdf(false, value);
						console.log(value);
					})
					.catch(() => {
						console.log("cancel");
					});
			}
		});
	}

	render() {
		return (
			<div>
				{this.state.loading ? (
					<div className="progress">
						<div className="prog-text">Generating proofs...</div>
						<div className="sk-folding-cube">
							<div className="sk-cube1 sk-cube" />
							<div className="sk-cube2 sk-cube" />
							<div className="sk-cube4 sk-cube" />
							<div className="sk-cube3 sk-cube" />
						</div>
					</div>
				) : null}

				{this.state.results ? (
					<div className="results">
						<h1>
							Proofs have<br /> been created.
						</h1>
						<div className="btns">
							<button onClick={this.refreshWindow}>remake</button>
							<button onClick={this.openFolder}>view</button>
						</div>
					</div>
				) : null}

				<Titlebar job={remote.getGlobal("jobNumber")} />
				<div className="main group">
					<Checkbox checked={this.state.clean} change={this.toggle.bind(this, "clean")} label="clean" />
					<Checkbox checked={this.state.marked} change={this.toggle.bind(this, "marked")} label="marked" />
					<Checkbox checked={this.state.markedCPO} change={this.toggle.bind(this, "markedCPO")} label="markedCPO" />
					<Checkbox checked={this.state.cumulative} change={this.toggle.bind(this, "cumulative")} label="cumulative" />
				</div>
				<div className="alt group">
					<Checkbox checked={this.state.marklvl} change={this.toggle.bind(this, "marklvl")} label="marked" />
					<Checkbox checked={this.state.cpolvl} change={this.toggle.bind(this, "cpolvl")} label="markedCPO" />

					<div>
						<input
							id="set-lvl"
							type="number"
							placeholder="enter level"
							value={this.state.level}
							onChange={this.handleChange}
							onBlur={this.handleLevel}
						/>
					</div>
				</div>
				<div className="btns">
					{/* <button onClick={this.pdfOut}>pdf out</button> */}
					<button onClick={this.overwrite}>overwrite</button>
					<button onClick={this.createPdf.bind(this, false)}>update</button>
				</div>
			</div>
		);
	}
}

export default App;
