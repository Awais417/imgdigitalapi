import React from 'react';
import './Hero.css';
import ButtonVariant from "./ButtonVariant";
const Hero = () => {
  return (
		<section className="hero">
			{/* 🔹 Background Video */}
			<video
				className="hero-video"
				src="/images/hero_vid.mp4"
				autoPlay
				loop
				muted
				playsInline
			/>
			<div className="container">
				<div className="hero-content">
					<h1 className="hero-title">
						DO MORE <span className="highlight">DEALS</span> WITH
					</h1>
					<p className="hero-subtitle">
						From Strategy To Execution, We Help You Unlock Opportunities And
						Exceed Expectations Do More With Every Deal
					</p>
					<div className="hero-cta">
						<ButtonVariant
							text="connect now"
							link="#"
							variant="green"
							showArrow={false}
						/>
					</div>
					<div className="social-links">
						<a href="#" className="social-link" aria-label="Facebook">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="39"
								height="39"
								viewBox="0 0 39 39"
								fill="none">
								<rect
									x="0.340789"
									y="0.340789"
									width="37.4868"
									height="37.4868"
									rx="18.7434"
									fill="url(#paint0_linear_1_117)"
									fill-opacity="0.1"
								/>
								<rect
									x="0.340789"
									y="0.340789"
									width="37.4868"
									height="37.4868"
									rx="18.7434"
									stroke="url(#paint1_linear_1_117)"
									stroke-width="0.681579"
								/>
								<path
									d="M20.8805 29.4292V20.3772H23.8992L24.4731 16.6326H20.8805V14.2027C20.8805 13.1783 21.3821 12.1798 22.9913 12.1798H24.6251V8.99206C24.6251 8.99206 23.1426 8.7392 21.7256 8.7392C18.7669 8.7392 16.8326 10.5324 16.8326 13.7788V16.6326H13.5433V20.3772H16.8326V29.4292H20.8805Z"
									fill="white"
								/>
								<defs>
									<linearGradient
										id="paint0_linear_1_117"
										x1="19.0842"
										y1="0"
										x2="19.0842"
										y2="38.1684"
										gradientUnits="userSpaceOnUse">
										<stop stop-color="#D9D9D9" />
										<stop offset="1" stop-color="#737373" />
									</linearGradient>
									<linearGradient
										id="paint1_linear_1_117"
										x1="43.6452"
										y1="4.51673"
										x2="11.5519"
										y2="45.0875"
										gradientUnits="userSpaceOnUse">
										<stop stop-color="#C0DAD0" />
										<stop offset="1" stop-color="#022334" />
									</linearGradient>
								</defs>
							</svg>
						</a>
						<a href="#" className="social-link" aria-label="Instagram">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="39"
								height="39"
								viewBox="0 0 39 39"
								fill="none">
								<rect
									x="0.340789"
									y="0.340789"
									width="37.4868"
									height="37.4868"
									rx="18.7434"
									fill="url(#paint0_linear_1_120)"
									fill-opacity="0.1"
								/>
								<rect
									x="0.340789"
									y="0.340789"
									width="37.4868"
									height="37.4868"
									rx="18.7434"
									stroke="url(#paint1_linear_1_120)"
									stroke-width="0.681579"
								/>
								<path
									d="M23.5602 13.6497C23.0129 13.6497 22.5692 14.0934 22.5692 14.6407C22.5692 15.188 23.0129 15.6317 23.5602 15.6317C24.1075 15.6317 24.5512 15.188 24.5512 14.6407C24.5512 14.0934 24.1075 13.6497 23.5602 13.6497Z"
									fill="white"
								/>
								<path
									d="M19.1537 14.9208C16.8582 14.9208 14.9907 16.7883 14.9907 19.0839C14.9907 21.3794 16.8582 23.2469 19.1537 23.2469C21.4493 23.2469 23.3168 21.3794 23.3168 19.0839C23.3168 16.7883 21.4493 14.9208 19.1537 14.9208ZM19.1537 21.7509C17.6829 21.7509 16.4867 20.5547 16.4867 19.0839C16.4867 17.613 17.6829 16.4168 19.1537 16.4168C20.6246 16.4168 21.8208 17.613 21.8208 19.0839C21.8208 20.5547 20.6246 21.7509 19.1537 21.7509Z"
									fill="white"
								/>
								<path
									d="M22.4587 27.5368H15.709C12.9091 27.5368 10.6313 25.259 10.6313 22.459V15.7094C10.6313 12.9094 12.9091 10.6316 15.709 10.6316H22.4587C25.2587 10.6316 27.5372 12.9094 27.5372 15.7094V22.459C27.5372 25.259 25.2587 27.5368 22.4587 27.5368ZM15.7097 12.2217C13.7863 12.2217 12.2221 13.7859 12.2221 15.7094V22.459C12.2221 24.3824 13.7863 25.9467 15.7097 25.9467H22.4594C24.3828 25.9467 25.947 24.3824 25.947 22.459V15.7094C25.947 13.7859 24.3821 12.2217 22.4594 12.2217H15.7097Z"
									fill="white"
								/>
								<defs>
									<linearGradient
										id="paint0_linear_1_120"
										x1="19.0842"
										y1="0"
										x2="19.0842"
										y2="38.1684"
										gradientUnits="userSpaceOnUse">
										<stop stop-color="#D9D9D9" />
										<stop offset="1" stop-color="#737373" />
									</linearGradient>
									<linearGradient
										id="paint1_linear_1_120"
										x1="43.6452"
										y1="4.51673"
										x2="11.5519"
										y2="45.0875"
										gradientUnits="userSpaceOnUse">
										<stop stop-color="#C0DAD0" />
										<stop offset="1" stop-color="#022334" />
									</linearGradient>
								</defs>
							</svg>
						</a>
						<a href="#" className="social-link" aria-label="LinkedIn">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="39"
								height="39"
								viewBox="0 0 39 39"
								fill="none">
								<rect
									x="0.340789"
									y="0.340789"
									width="37.4868"
									height="37.4868"
									rx="18.7434"
									fill="url(#paint0_linear_1_125)"
									fill-opacity="0.1"
								/>
								<rect
									x="0.340789"
									y="0.340789"
									width="37.4868"
									height="37.4868"
									rx="18.7434"
									stroke="url(#paint1_linear_1_125)"
									stroke-width="0.681579"
								/>
								<path
									d="M12.5765 16.8275H15.3689V25.7985H12.5765V16.8275ZM13.9731 12.37C14.8659 12.37 15.5898 13.0945 15.5898 13.9854C15.5898 14.8775 14.8659 15.6034 13.9731 15.6034C13.0775 15.6034 12.3543 14.8775 12.3543 13.9854C12.3543 13.0945 13.0781 12.37 13.9731 12.37Z"
									fill="white"
								/>
								<path
									d="M17.1185 16.8275H19.793V18.0544H19.8298C20.2027 17.3483 21.1126 16.6053 22.4703 16.6053C25.2934 16.6053 25.8141 18.462 25.8141 20.8782V25.7985H23.0278V21.4371C23.0278 20.3956 23.0074 19.0583 21.5788 19.0583C20.127 19.0583 19.9062 20.1918 19.9062 21.3614V25.7985H17.1192L17.1185 16.8275Z"
									fill="white"
								/>
								<defs>
									<linearGradient
										id="paint0_linear_1_125"
										x1="19.0842"
										y1="0"
										x2="19.0842"
										y2="38.1684"
										gradientUnits="userSpaceOnUse">
										<stop stop-color="#D9D9D9" />
										<stop offset="1" stop-color="#737373" />
									</linearGradient>
									<linearGradient
										id="paint1_linear_1_125"
										x1="43.6452"
										y1="4.51673"
										x2="11.5519"
										y2="45.0875"
										gradientUnits="userSpaceOnUse">
										<stop stop-color="#C0DAD0" />
										<stop offset="1" stop-color="#022334" />
									</linearGradient>
								</defs>
							</svg>
						</a>
						<a href="#" className="social-link" aria-label="Snapchat">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="39"
								height="39"
								viewBox="0 0 39 39"
								fill="none">
								<rect
									x="0.340789"
									y="0.340789"
									width="37.4868"
									height="37.4868"
									rx="18.7434"
									fill="url(#paint0_linear_1_130)"
									fill-opacity="0.1"
								/>
								<rect
									x="0.340789"
									y="0.340789"
									width="37.4868"
									height="37.4868"
									rx="18.7434"
									stroke="url(#paint1_linear_1_130)"
									stroke-width="0.681579"
								/>
								<path
									d="M19.0846 27.8722C18.3682 27.8722 17.6492 27.6656 16.9485 27.2574C16.6697 27.0951 16.4012 26.9152 16.1327 26.7346L15.8266 26.5301C15.5928 26.3788 15.3359 26.2854 15.0196 26.2384C14.9031 26.2207 14.79 26.2132 14.6775 26.2132C14.4021 26.2132 14.1322 26.2527 13.8616 26.2916L13.4322 26.3468L13.2946 26.3529C12.7643 26.3529 12.3908 26.036 12.3649 25.5636C12.3472 25.2426 12.2817 25.1049 11.6956 25.0409C11.3439 25.0013 11.0126 24.863 10.7475 24.7512C10.2881 24.5604 9.98277 24.2877 9.81647 23.9197L9.77557 23.8297V23.2831L9.88667 23.1536C10.04 22.9757 10.2397 22.7848 10.5648 22.7215C11.7385 22.4884 12.6437 21.7856 13.4132 20.509C13.7056 20.0238 13.7267 19.8799 13.7226 19.8411C13.7056 19.822 13.5951 19.7225 13.0362 19.5242C12.9238 19.4867 12.8706 19.4703 12.8188 19.4485C12.5476 19.3367 12.2599 19.2086 12.003 18.9871C11.6574 18.6858 11.5163 18.2823 11.6152 17.8761C11.7235 17.4351 12.0957 17.0855 12.5878 16.9669C12.6886 16.943 12.7922 16.9308 12.8958 16.9308C13.1712 16.9308 13.4118 17.0126 13.6244 17.0848C13.6926 17.1073 13.7601 17.1305 13.8242 17.1482C13.7614 16.4686 13.7526 15.7646 13.7921 14.9153C13.8671 13.3048 14.6536 12.0111 16.0645 11.1748C17.0473 10.5914 18.0629 10.2963 19.0832 10.2963C20.0926 10.2963 21.098 10.5859 22.0719 11.1571C23.3819 11.9246 24.1637 13.0955 24.3341 14.5418C24.4377 15.4272 24.4023 16.3037 24.3409 17.1264C24.392 17.1107 24.4418 17.095 24.4915 17.0793C24.7151 17.0098 24.968 16.9294 25.2495 16.9294C25.4546 16.9294 25.6482 16.9703 25.8397 17.0541C26.312 17.262 26.6106 17.688 26.5997 18.1385C26.5922 18.4445 26.4361 18.7526 26.173 18.9803C25.9079 19.2106 25.595 19.3367 25.3183 19.4485L24.9816 19.578C24.8623 19.621 24.7424 19.6646 24.6279 19.7184C24.4847 19.7845 24.45 19.8322 24.4466 19.837C24.4479 19.8384 24.4466 19.8847 24.4977 19.9931C25.2242 21.5294 26.1948 22.3916 27.5518 22.7099C27.8783 22.7855 28.1237 22.9382 28.3009 23.1761L28.3929 23.2987V23.8345L28.3466 23.9306C28.1591 24.3163 27.8299 24.5938 27.3412 24.7785C26.9411 24.9325 26.5963 25.064 26.2146 25.0893C25.9399 25.107 25.8772 25.1649 25.8383 25.4328C25.7763 25.8547 25.6121 26.3386 24.8848 26.3386C24.8153 26.3386 24.7362 26.3352 24.649 26.3277C24.5304 26.3181 24.4084 26.2977 24.2871 26.2745C24.0288 26.2289 23.7963 26.205 23.5694 26.205C22.9682 26.205 22.4625 26.3781 22.0242 26.7326C21.8818 26.8464 21.7277 26.9466 21.5737 27.0447C20.702 27.6097 19.8902 27.8722 19.0846 27.8722Z"
									fill="white"
								/>
								<defs>
									<linearGradient
										id="paint0_linear_1_130"
										x1="19.0842"
										y1="0"
										x2="19.0842"
										y2="38.1684"
										gradientUnits="userSpaceOnUse">
										<stop stop-color="#D9D9D9" />
										<stop offset="1" stop-color="#737373" />
									</linearGradient>
									<linearGradient
										id="paint1_linear_1_130"
										x1="43.6452"
										y1="4.51673"
										x2="11.5519"
										y2="45.0875"
										gradientUnits="userSpaceOnUse">
										<stop stop-color="#C0DAD0" />
										<stop offset="1" stop-color="#022334" />
									</linearGradient>
								</defs>
							</svg>
						</a>
						<a href="#" className="social-link" aria-label="TikTok">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="39"
								height="39"
								viewBox="0 0 39 39"
								fill="none">
								<rect
									x="0.340789"
									y="0.340789"
									width="37.4868"
									height="37.4868"
									rx="18.7434"
									fill="url(#paint0_linear_1_133)"
									fill-opacity="0.1"
								/>
								<rect
									x="0.340789"
									y="0.340789"
									width="37.4868"
									height="37.4868"
									rx="18.7434"
									stroke="url(#paint1_linear_1_133)"
									stroke-width="0.681579"
								/>
								<path
									d="M26.9033 17.3418H26.9006C26.7513 17.3561 26.6013 17.3636 26.4514 17.3643C24.8061 17.3643 23.2711 16.5348 22.3694 15.158V22.6697C22.3694 25.7361 19.8837 28.2218 16.8173 28.2218C13.7509 28.2218 11.2651 25.7361 11.2651 22.6697C11.2651 19.6033 13.7509 17.1175 16.8173 17.1175C16.9331 17.1175 17.0463 17.1278 17.1608 17.1353V19.8711C17.047 19.8575 16.9345 19.8364 16.8173 19.8364C15.2524 19.8364 13.9839 21.1048 13.9839 22.6697C13.9839 24.2346 15.2524 25.503 16.8173 25.503C18.3822 25.503 19.7651 24.27 19.7651 22.7044L19.7924 9.94666H22.4096C22.6564 12.294 24.5491 14.1275 26.9026 14.2992V17.3418H26.9033Z"
									fill="white"
								/>
								<defs>
									<linearGradient
										id="paint0_linear_1_133"
										x1="19.0842"
										y1="0"
										x2="19.0842"
										y2="38.1684"
										gradientUnits="userSpaceOnUse">
										<stop stop-color="#D9D9D9" />
										<stop offset="1" stop-color="#737373" />
									</linearGradient>
									<linearGradient
										id="paint1_linear_1_133"
										x1="43.6452"
										y1="4.51673"
										x2="11.5519"
										y2="45.0875"
										gradientUnits="userSpaceOnUse">
										<stop stop-color="#C0DAD0" />
										<stop offset="1" stop-color="#022334" />
									</linearGradient>
								</defs>
							</svg>
						</a>
					</div>
				</div>
			</div>
		</section>
	);
};

export default Hero;
