import React, { Component } from "react";
import "./style.scss";

const Loading = () => {
	return (
		<div className="progress">
			<div className="prog-text">Generating proofs...</div>
			<div className="sk-folding-cube">
				<div className="sk-cube1 sk-cube" />
				<div className="sk-cube2 sk-cube" />
				<div className="sk-cube4 sk-cube" />
				<div className="sk-cube3 sk-cube" />
			</div>
		</div>
	);
};

export default Loading;
