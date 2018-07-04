import React, { Component } from "react";
import { remote } from "electron";
import "./style.scss";

const closeWindow = () => {
	remote.BrowserWindow.getFocusedWindow().close();
};

const Titlebar = props => {
	return (
		<div id="titlebar">
			<div className="job-number">{props.job || "Job not found"}</div>
			<div className="close-btn" onClick={closeWindow}>
				x
			</div>
		</div>
	);
};

export default Titlebar;
