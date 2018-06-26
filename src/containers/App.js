import React, { Component } from "react";
import { ipcRenderer as ipc, remote } from "electron";
import "./global.scss";
import "./style.scss";

import Titlebar from "../components/Titlebar";
import Checkbox from "../components/Checkbox";
import fs from "fs";

class App extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loading: false,
			clean: true,
			marked: true,
			markedCPO: true,
			cumulative: false,
			marklvl: false,
			cpolvl: false,
			level: "",
			proofs: ["clean", "marked", "markedCPO"]
		};

		this.handleChange = this.handleChange.bind(this);
		this.handleLevel = this.handleLevel.bind(this);
		this.pdfOut = this.pdfOut.bind(this);
		this.updatePdf = this.updatePdf.bind(this);
	}

	componentDidMount() {
		let counter = 0;

		ipc.on("proof_made", (event, proofName) => {
			counter++;
			console.log(proofName);

			if (counter == this.state.proofs.length) {
				this.setState({ loading: false });
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

	pdfOut() {
		let location = "N:\\PDF\\out";
		this.setState({ loading: true });

		this.state.proofs.map(type => {
			ipc.send("print-pdf", type, location);
		});
	}

	updatePdf() {
		let company = "";
		let draftNumber = "";
		let run = false;

		let jobNumber = remote
			.getGlobal("jobNumber")
			.split("_")[1]
			.split("x")[0];
		let xNumber = remote
			.getGlobal("jobNumber")
			.split("_")[1]
			.split("x")[1];

		let location = `M:\\${jobNumber}\\x${xNumber}`; //TODO: Change to M:\\ When ready for production

		fs.readdir(location, (err, files) => {
			files.forEach(a => {
				if (a.indexOf(".pdf") > -1) run = true;
			});

			if (run) {
				files.forEach(file => {
					let temp = file.split(".");

					if (temp[1] === "pdf") {
						if (temp[0].split("_").length > 4) {
							company = temp[0].split("_")[2];
							draftNumber = temp[0].split("_");
							draftNumber = draftNumber[draftNumber.length - 1].substring(5);

							fs.rename(`${location}\\${file}`, `${location}\\Old PDF\\${file}`, err => {
								if (err) {
									console.log(err);
									return;
								}
							});
						}
					}
				});

				draftNumber++;

				this.state.proofs.map(type => {
					this.setState({ loading: true });

					name = `${remote.getGlobal("jobNumber").substring(4)}_${company}_${type.charAt(0).toUpperCase() +
						type.slice(1)}_Draft${draftNumber}`;

					if (!fs.existsSync(`${location}\\${name}`)) {
						ipc.send("print-pdf", type, location, name);
					} else {
						console.log("SAME DRAFT # - WUT");
						//TODO: Handle error
					}
				});
			} else {
				console.log("NEED COMPANY NAME");
				//TODO: Setup company name prompt
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

				<Titlebar />
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
					<button onClick={this.pdfOut}>pdf out</button>
					<button onClick={this.updatePdf}>update</button>
				</div>
			</div>
		);
	}
}

export default App;
