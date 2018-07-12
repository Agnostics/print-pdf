import React, { Component } from "react";
import { ipcRenderer as ipc, remote, shell } from "electron";
import "./global.scss";
import "./style.scss";

import Titlebar from "../components/Titlebar";
import Checkbox from "../components/Checkbox";
import Loading from "../components/Loading";

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
			companyName: "",
			draftNumber: 1,
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
		this.isValidChoices = this.isValidChoices.bind(this);
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

		ipc.on("debug", (event, info) => {
			console.log(info);
		});

		ipc.on("make_cpo_lvl", (event, type, location, name) => {
			ipc.send("set-level", location, name, this.state.level);
		});

		ipc.on("proof_made", (event, type, err) => {
			counter++;

			if (err) {
				smalltalk.alert("Error", type.toString());
			} else {
				console.log(`Proof Created: ${type}`);
			}

			if (counter == this.state.proofs.length) {
				this.loadResults(err);
				return;
			}

			if (this.state.proofs.includes("cpolvl")) {
				if (counter == this.state.proofs.length - 1) {
					if (this.state.level == "001") {
						name = `${remote.getGlobal("jobNumber").substring(4)}_${this.state.companyName}_CumulativeCPO_Draft${this.state.draftNumber}`;
					} else {
						name = `${remote.getGlobal("jobNumber").substring(4)}_${this.state.companyName}_MarkedCPO_${this.state.level}_Draft${
							this.state.draftNumber
						}`;
					}

					ipc.send("set-level", this.state.location, name, this.state.level);
					return;
				}
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

	loadResults(isErr) {
		if (isErr) console.log("ABORT MISSION");
		this.setState({ results: true, loading: false });
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
				console.log("Option: no");
			});
	}

	isValidChoices() {
		let proofs = this.state.proofs;

		if (this.state.proofs.includes("cpolvl")) {
			const index = proofs.indexOf("cpolvl");
			proofs.splice(index, 1);
			proofs.push("cpolvl");
			this.setState({ proofs });
		}

		if (this.state.proofs.includes("marklvl") && this.state.level < 1) {
			smalltalk.alert("Error", "Level must be specified.");
			return false;
		} else if (this.state.proofs.includes("cpolvl") && this.state.level < 1) {
			smalltalk.alert("Error", "Level must be specified.");
			return false;
		} else {
			return true;
		}
	}

	pdfOut() {
		let location = "N:\\PDF\\out";
		this.setState({ loading: true });

		this.state.proofs.map(type => {
			ipc.send("print-pdf", type, location, "", this.state.level);
		});
	}

	createPdf(overwrite, companyName) {
		if (!this.isValidChoices()) return;

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

				this.setState({ companyName: company, draftNumber });

				this.state.proofs.map(type => {
					this.setState({ loading: true });

					let name;

					if (type === "marklvl") {
						name = `${remote.getGlobal("jobNumber").substring(4)}_${company}_Marked_${this.state.level}_Draft${draftNumber}`;
					} else if (type === "cpolvl") {
						if (this.state.level == "001") {
							name = `${remote.getGlobal("jobNumber").substring(4)}_${this.state.companyName}_CumulativeCPO_Draft${this.state.draftNumber}`;
						} else {
							name = `${remote.getGlobal("jobNumber").substring(4)}_${this.state.companyName}_MarkedCPO_${this.state.level}_Draft${
								this.state.draftNumber
							}`;
						}
					} else {
						name = `${remote.getGlobal("jobNumber").substring(4)}_${company}_${type.charAt(0).toUpperCase() + type.slice(1)}_Draft${draftNumber}`;
					}

					if (!fs.existsSync(`${location}\\${name}`)) {
						if (this.state.proofs.includes("cpolvl") && this.state.proofs.length == 1) {
							ipc.send("print-pdf", type, location, name, this.state.level, true);
						} else {
							ipc.send("print-pdf", type, location, name, this.state.level, false);
						}
					}
				});
			} else {
				console.log("Requires company name");

				smalltalk
					.prompt("No PDFs found", "Enter company's name")
					.then(value => {
						this.createPdf(false, value);
						console.log(`Company name: ${value}`);
					})
					.catch(err => {
						console.log(err);
					});
			}
		});
	}

	render() {
		return (
			<div>
				{this.state.loading ? <Loading /> : null}
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
							min="0"
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
