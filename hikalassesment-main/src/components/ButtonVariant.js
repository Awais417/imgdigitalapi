import React from "react";
import { ArrowRight } from "lucide-react";
import "./ButtonVariant.css";

const SeeMoreButton = ({
	text = "See More",
	link = "#",
	showArrow = true,
	variant = "green",
}) => {
	return (
		<a href={link} className={`see-more-btn ${variant}`}>
			<span>{text}</span>
			{showArrow && <ArrowRight size={18} className="arrow-icon" />}
		</a>
	);
};

export default SeeMoreButton;
