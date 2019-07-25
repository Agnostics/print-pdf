import React, { Component } from "react";
import "./style.scss";

const Checkbox = props => {
	return (
		<label className="container">
			<input type="checkbox" checked={props.checked} onChange={props.change} />
			<span className="checkmark" />
<<<<<<< HEAD
			<span className="checkText">{props.label}</span>
=======
			{props.label}
>>>>>>> f8a2ef2d2b5c58ce2913264bb0afadd9af338424
		</label>
	);
};

export default Checkbox;
