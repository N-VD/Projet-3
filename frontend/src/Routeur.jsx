import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./Pages/App.jsx";
import Register from "./Pages/Register.jsx";
import Login from "./Pages/Login.jsx";

function isTokenExpired(token) {
	const payload = JSON.parse(atob(token.split(".")[1]));
	return payload.exp * 1000 < Date.now(); // exp is in seconds
}

function Routeur() {
	const [isLoggedIn, setIsLoggedIn] = useState(() => {
		const token = localStorage.getItem("token");
		if (!token) return false;
		if (isTokenExpired(token)) {
			localStorage.removeItem("token");
			return false;
		}
		return true;
	});

	return (
		<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
			<Routes>
				<Route path="/" element={<App isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />} />
				<Route path="/register" element={<Register />} />
				<Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
			</Routes>
		</BrowserRouter>
	);
}

export default Routeur;
