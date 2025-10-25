import React, { useState } from 'react';
import './Header.css';
import Button from './Button';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
		<header className="header">
			<div className="container">
				<div className="header-content">
					{/* Logo */}
					<div className="logo">
						<div className="logo-icon">
							<img src="/images/logo_header.png"></img>
						</div>
					</div>

					{/* Navigation */}
					<nav className={`nav ${isMenuOpen ? "nav-open" : ""}`}>
						<ul className="nav-list">
							<li>
								<a href="#home" className="nav-link active">
									Home
								</a>
							</li>
							<li>
								<a href="#about" className="nav-link">
									About
								</a>
							</li>
							<li>
								<a href="#services" className="nav-link">
									Services
								</a>
							</li>
							<li>
								<a href="#cases" className="nav-link">
									Cases
								</a>
							</li>
							<li>
								<a href="#latest" className="nav-link">
									Latest
								</a>
							</li>
							<li>
								<a href="#connect" className="nav-link">
									Connect us
								</a>
							</li>
						</ul>
					</nav>

					{/* CTA Button */}
					<div className="header-cta">
						<Button text="Get In Touch" onClick={() => alert("Clicked!")} />
					</div>

					{/* Mobile Menu Toggle */}
					<button className="mobile-menu-toggle" onClick={toggleMenu}>
						<span></span>
						<span></span>
						<span></span>
					</button>
				</div>
			</div>
		</header>
	);
};

export default Header;
