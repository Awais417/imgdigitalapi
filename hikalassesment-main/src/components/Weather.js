import React, { useState, useEffect } from "react";
import "./Weather.css";
import Button from "./Button";

const Weather = () => {
	const [searchCity, setSearchCity] = useState("");
	const [weatherData, setWeatherData] = useState({
		location: "SOUTH KOREA",
		currentTemp: 31,
		rainChance: 0,
		realFeel: 30,
		wind: "0.2 Km/H",
		uvIndex: 3,
		todayForecast: [
			{ time: "6:00 AM", temp: 26, icon: "cloudy" },
			{ time: "9:00 AM", temp: 28, icon: "sun" },
			{ time: "12:00 PM", temp: 31, icon: "sun" },
			{ time: "3:00 PM", temp: 33, icon: "sun" },
			{ time: "6:00 PM", temp: 30, icon: "cloudy" },
			{ time: "9:00 PM", temp: 28, icon: "cloudy" },
		],
		weeklyForecast: [
			{ day: "Today", condition: "Sunny", temp: "36/22", icon: "sun" },
			{ day: "Tue", condition: "Cloudy", temp: "37/21", icon: "cloudy" },
			{ day: "Wed", condition: "Rainy", temp: "32/19", icon: "rainy" },
			{ day: "Thu", condition: "Storm", temp: "29/17", icon: "storm" },
			{ day: "Fri", condition: "Sunny", temp: "34/20", icon: "sun" },
			{ day: "Sat", condition: "Cloudy", temp: "31/18", icon: "cloudy" },
			{ day: "Sun", condition: "Sunny", temp: "33/19", icon: "sun" },
		],
	});

	// Function to get weather image instead of SVG
	const getWeatherImage = (type) => {
		const images = {
			sun: "/images/sun.png",
			cloudy: "/images/sunrain.png",
			rainy: "/images/rainy.png",
			storm: "/images/storm.png",
		};

		// Default to sun if type not found
		return images[type] || images.sun;
	};

	const handleSearch = (e) => {
		e.preventDefault();
		if (searchCity.trim()) {
			console.log("Searching for:", searchCity);
		}
	};

	return (
		<section className="weather" id="weather">
			<div className="container">
				<div className="weather-header">
					<p className="section-tag">Look At Our Services</p>
					<h2 className="section-title">
						Explore Our <span className="highlight">Weather</span>
					</h2>
					<p className="section-description">
						With DODEAL, Your Goals Are Our Mission. From Ground Breaking
						Marketing Campaigns To Seamless Tech Integrations
					</p>
				</div>

				<div className="weather-search">
					<form onSubmit={handleSearch} className="search-form">
						<div className="search-input">
							<svg
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								className="search-icon">
								<circle
									cx="11"
									cy="11"
									r="8"
									stroke="currentColor"
									strokeWidth="2"
								/>
								<path
									d="M21 21l-4.35-4.35"
									stroke="currentColor"
									strokeWidth="2"
								/>
							</svg>
							<input
								type="text"
								placeholder="Search For Cities"
								value={searchCity}
								onChange={(e) => setSearchCity(e.target.value)}
							/>
						</div>
					</form>
				</div>

				<div className="weather-content">
					<div className="current-weather">
						<div className="weather_top_main">
							<div className="weather_top_left">
								<div className="weather-location">
									<h3>{weatherData.location}</h3>
									<p>Chance Of Rain : {weatherData.rainChance}%</p>
								</div>

								<div className="current-temp">
									<span className="temp-value">{weatherData.currentTemp}°</span>
								</div>
							</div>
							<div className="weather_top_right">
								<img src="/images/sun.png" alt="Current weather" />
							</div>
						</div>

						<div className="today-forecast">
							<div className="today_head">
								<h6>Today forecast</h6>
							</div>
							<div className="forecast-scroll">
								{weatherData.todayForecast.map((item, index) => (
									<div key={index} className="forecast-item">
										<span className="forecast-time">{item.time}</span>
										<div className="forecast-icon">
											<img
												src={getWeatherImage(item.icon)}
												alt={item.icon}
												width="40"
												height="40"
											/>
										</div>
										<span className="forecast-temp">{item.temp}°</span>
									</div>
								))}
							</div>
						</div>

						<div className="air-conditions">
							<div className="conditions-header">
								<h4>AIR CONDITIONS</h4>
								<Button text="See More" onClick={() => alert("Clicked!")} />
							</div>
							<div className="conditions-grid">
								<div className="condition-item">
									<div className="condition-icon">
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
											<path
												d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"
												stroke="currentColor"
												strokeWidth="2"
											/>
										</svg>
									</div>
									<div className="condition-info">
										<span className="condition-label">Real Feel</span>
										<span className="condition-value">
											{weatherData.realFeel}°
										</span>
									</div>
								</div>
								<div className="condition-item">
									<div className="condition-icon">
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
											<path
												d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"
												stroke="currentColor"
												strokeWidth="2"
											/>
										</svg>
									</div>
									<div className="condition-info">
										<span className="condition-label">Chance To Rain</span>
										<span className="condition-value">
											{weatherData.rainChance}%
										</span>
									</div>
								</div>
								<div className="condition-item">
									<div className="condition-icon">
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
											<path
												d="M17.7 7.7a2.5 2.5 0 0 1 1.7 2.3v1.5a2.5 2.5 0 0 1-2.5 2.5H5.5A2.5 2.5 0 0 1 3 12.5V10a2.5 2.5 0 0 1 2.5-2.5h12.2"
												stroke="currentColor"
												strokeWidth="2"
											/>
										</svg>
									</div>
									<div className="condition-info">
										<span className="condition-label">Wind</span>
										<span className="condition-value">{weatherData.wind}</span>
									</div>
								</div>
								<div className="condition-item">
									<div className="condition-icon">
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
											<circle
												cx="12"
												cy="12"
												r="5"
												stroke="currentColor"
												strokeWidth="2"
											/>
											<path
												d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
												stroke="currentColor"
												strokeWidth="2"
											/>
										</svg>
									</div>
									<div className="condition-info">
										<span className="condition-label">UV Index</span>
										<span className="condition-value">
											{weatherData.uvIndex}
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="weekly-forecast">
						<div className="forecast-header">
							<h4>7- DAYS FORECAST</h4>
						</div>
						<div className="forecast-list">
							{weatherData.weeklyForecast.map((day, index) => (
								<div key={index} className="forecast-day">
									<span className="day-name">{day.day}</span>
									<div className="day-icon">
										<img
											src={getWeatherImage(day.icon)}
											alt={day.icon}
											width="40"
											height="40"
										/>
									</div>
									<span className="day-condition">{day.condition}</span>
									<span className="day-temp">{day.temp}</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default Weather;
