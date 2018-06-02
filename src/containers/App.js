import React, { Component } from "react";
import { ipcRenderer as ipc, remote } from "electron";
import "./global.scss";
import "./style.scss";
import Titlebar from "../components/Titlebar";

class App extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
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
	}

	componentDidMount() {
		ipc.on("printed", (event, path) => {
			console.log(path);
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

		this.state.proofs.map(type => {
			ipc.send("print-pdf", type, location);
		});
	}

	render() {
		return (
			<div>
				<Titlebar />
				<div className="main group">
					<label className="container">
						<input type="checkbox" checked={this.state.clean} onChange={this.toggle.bind(this, "clean")} />
						<span className="checkmark" />
						clean
					</label>
					<label className="container">
						<input type="checkbox" checked={this.state.marked} onChange={this.toggle.bind(this, "marked")} />
						<span className="checkmark" />
						marked
					</label>
					<label className="container">
						<input type="checkbox" checked={this.state.markedCPO} onChange={this.toggle.bind(this, "markedCPO")} />
						<span className="checkmark" />markedCPO
					</label>
					<label className="container">
						<input type="checkbox" checked={this.state.cumulative} onChange={this.toggle.bind(this, "cumulative")} />
						<span className="checkmark" />
						cumulative
					</label>
				</div>
				<div className="alt group">
					<label className="container">
						<input type="checkbox" checked={this.state.marklvl} onChange={this.toggle.bind(this, "marklvl")} />
						<span className="checkmark" />
						marked
					</label>
					<label className="container">
						<input type="checkbox" checked={this.state.cpolvl} onChange={this.toggle.bind(this, "cpolvl")} />
						<span className="checkmark" />
						markedCPO
					</label>

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
					<button disabled>update</button>
				</div>
			</div>
		);
	}
}

export default App;
