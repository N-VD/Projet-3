import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Register from "./Pages/Register.jsx";
import Login from "./Pages/Login.jsx";
import Compte from "./Pages/Compte.jsx";
import Navbar from "./Pages/Navbar.jsx";
import AuthPopup from "./Pages/AuthPopup.jsx";
import Salon from "./Pages/Salon.jsx";
import Blackjack from "./Pages/Blackjack.jsx";
import BlackjackCamera from "./Pages/Blackjack_Camera.jsx";
import SpectateurTable from "./Pages/SpectateurTable.jsx";
import GithubCallback from "./Pages/GithubCallback.jsx";

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
	const [isSpectateur, setIsSpectateur] = useState(false);
	const [isGuest, setIsGuest] = useState(() => sessionStorage.getItem("guest") === "true");
	const fond = <Salon isLoggedIn={false} setIsLoggedIn={setIsLoggedIn} />;

	return (
		<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
			<Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
			<AuthPopup isLoggedIn={isLoggedIn} isGuest={isGuest} setIsGuest={setIsGuest} />
			<Routes>
				<Route
					path="/"
					element={
						isLoggedIn
							? <Salon setIsLoggedIn={setIsLoggedIn} setIsSpectateur={setIsSpectateur} isSpectateur={false} />
							: isGuest || isSpectateur
								? <Navigate to="/spectateur" replace />
								: <Navigate to="/login" replace />
					}
				/>
				<Route
					path="/login"
					element={
						isLoggedIn ? (
							<Navigate to="/" replace />
						) : (
							<>
								{fond}
								<Login setIsLoggedIn={setIsLoggedIn} setIsSpectateur={setIsSpectateur} />
							</>
						)
					}
				/>
				<Route
					path="/register"
					element={
						isLoggedIn ? (
							<Navigate to="/" replace />
						) : (
							<>
								{fond}
								<Register setIsLoggedIn={setIsLoggedIn} />
							</>
						)
					}
				/>
				<Route
					path="/spectateur"
					element={
						isGuest || isSpectateur || (!isLoggedIn && sessionStorage.getItem("guest") === "true")
							? <Salon setIsLoggedIn={setIsLoggedIn} setIsSpectateur={setIsSpectateur} isSpectateur={true} />
							: <Navigate to="/login" replace />
					}
				/>
				<Route
					path="/auth/github/callback"
					element={isLoggedIn ? <Navigate to="/" replace /> : <GithubCallback setIsLoggedIn={setIsLoggedIn} />}
				/>
				<Route
					path="/compte"
					element={isLoggedIn ? <Compte /> : <Navigate to="/login" replace />}
				/>
				<Route
					path="/jeux/blackjack"
					element={isLoggedIn ? <Blackjack isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/login" replace />}
				/>
				<Route
					path="/jeux/blackjack-camera/:id"
					element={isLoggedIn ? <BlackjackCamera /> : <Navigate to="/login" replace />}
				/>
				<Route
					path="/dashboard"
					element={<Navigate to="/" replace />}
				/>
				<Route
					path="/spectateur/:id"
					element={<SpectateurTable />}
				/>
			</Routes>
		</BrowserRouter>
	);
}

export default Routeur;
