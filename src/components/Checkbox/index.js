import React, { Component } from "react";
import "./style.scss";

const Checkbox = props => {
	return (
		<label className="container">
			<input type="checkbox" checked={props.checked} onChange={props.change} />
			<span className="checkmark" />
			<span className="checkText">{props.label}</span>
		</label>
	);
};

export default Checkbox;
