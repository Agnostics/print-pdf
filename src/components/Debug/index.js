import React, { Component } from "react";
import "../Loading/style.scss";

class Debug extends Component {
	constructor(props) {
		super(props);

		this.messagesEnd = React.createRef();
	}

	componentDidMount() {
		this.scrollToBottom();
	}

	componentDidUpdate() {
		this.scrollToBottom();
	}

	scrollToBottom() {
		this.messagesEnd.scrollIntoView();
	}

	render() {
		return (
			<div className="progress">
				<div id="loading-text" className="prog-text">
					&nbsp;&nbsp; composing job...
				</div>
				<div id="loading-cube" className="sk-folding-cube">
					<div className="sk-cube1 sk-cube" />
					<div className="sk-cube2 sk-cube" />
					<div className="sk-cube4 sk-cube" />
					<div className="sk-cube3 sk-cube" />
				</div>

				<div className="showProcess">
					{this.props.debugInfo.map((item, key) => (
						<div key={key} className="debugText">
							{item}
						</div>
					))}
					<div
						style={{ float: "left", clear: "both" }}
						ref={el => {
							this.messagesEnd = el;
						}}
					/>
				</div>
			</div>
		);
	}
}

export default Debug;
