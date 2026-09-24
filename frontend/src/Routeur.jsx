import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./Pages/App.jsx";
import Register from "./Pages/Register.jsx";
import Login from "./Pages/Login.jsx";
import Compte from "./Pages/Compte.jsx";
import Navbar from "./Pages/Navbar.jsx";
import Dashboard from "./Pages/Dashboard.jsx";

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
				<Route
					path="/register"
					element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Register setIsLoggedIn={setIsLoggedIn} />}
				/>
				<Route
					path="/login"
					element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login setIsLoggedIn={setIsLoggedIn} />}
				/>
				<Route
					path="/dashboard"
					element={isLoggedIn ? <Dashboard isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/login" replace />}
				/>
			</Routes>
		</BrowserRouter>
	);
}

export default Routeur;
