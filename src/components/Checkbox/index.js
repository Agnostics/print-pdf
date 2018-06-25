import React, { Component } from "react";
import "./style.scss";

const Checkbox = props => {
	return (
		<label className="container">
			<input type="checkbox" checked={props.checked} onChange={props.change} />
			<span className="checkmark" />
			{props.label}
		</label>
	);
};

export default Checkbox;
