import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./Pages/App.jsx";
import Register from "./Pages/Register.jsx";
import Login from "./Pages/Login.jsx";
import Compte from "./Pages/Compte.jsx";
import Navbar from "./Pages/Navbar.jsx";
import AuthPopup from "./Pages/AuthPopup.jsx";
import Salon from "./Pages/Salon.jsx";
import Blackjack from "./Pages/Blackjack.jsx";
import SpectateurTable from "./Pages/SpectateurTable.jsx";
import GithubCallback from "./Pages/GithubCallback.jsx";
import { API_URL } from "./Pages/reglesBlackjack/constantes.js";

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
	const [solde, setSolde] = useState(null);

	useEffect(() => {
		let annule = false;
		const token = localStorage.getItem("token");

		if (!isLoggedIn || !token) {
			Promise.resolve().then(() => {
				if (!annule) setSolde(null);
			});
			return () => {
				annule = true;
			};
		}

		fetch(`${API_URL}/solde`, {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then(async (response) => {
				if (!response.ok) throw new Error("Solde indisponible");
				const data = await response.json();
				if (!annule) setSolde(data.solde ?? 0);
			})
			.catch(() => {
				if (!annule) setSolde(null);
			});

		return () => {
			annule = true;
		};
	}, [isLoggedIn]);

	const fond = <Salon isLoggedIn={false} setIsLoggedIn={setIsLoggedIn} setSoldeGlobal={setSolde} />;

	return (
		<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
			<Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} soldeGlobal={solde} />
			<AuthPopup isLoggedIn={isLoggedIn} isGuest={isGuest} setIsGuest={setIsGuest} />
			<Routes>
				<Route
					path="/"
					element={
						isLoggedIn
							? <Salon setIsLoggedIn={setIsLoggedIn} setSoldeGlobal={setSolde} setIsSpectateur={setIsSpectateur} isSpectateur={false} />
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
							? <Salon setIsLoggedIn={setIsLoggedIn} setSoldeGlobal={setSolde} setIsSpectateur={setIsSpectateur} isSpectateur={true} />
							: <Navigate to="/login" replace />
					}
				/>
				<Route
					path="/auth/github/callback"
					element={isLoggedIn ? <Navigate to="/" replace /> : <GithubCallback setIsLoggedIn={setIsLoggedIn} />}
				/>
				<Route
					path="/compte"
					element={isLoggedIn ? <Compte setSoldeGlobal={setSolde} /> : <Navigate to="/login" replace />}
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
