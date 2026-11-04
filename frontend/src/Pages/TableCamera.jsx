import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_URL, Carte } from "./reglesBlackjack/outils.js";

const LIBELLES_ACTIONS = { hit: "Tirer", stand: "Rester", double: "Doubler", split: "Séparer" };

/** Entrée : main décrite par le serveur; sortie : total affiché (ex. « 7/17 » pour une main soft). */
function texteTotal(main) {
	return main.soft && main.total !== 21 ? `${main.total - 10}/${main.total}` : `${main.total}`;
}

/** Entrées : main lue par la caméra et son libellé; sortie : le JSX de la main avec total et actions. */
function MainCamera({ main, libelle }) {
	return (
		<div className="bj-main">
			<div className="bj-cartes">{main.cartes.map((carte, index) => <Carte key={index} carte={carte} />)}</div>
			<p className="has-text-weight-semibold">{libelle} · {texteTotal(main)}</p>
			<div className="tags is-centered">
				{!main.complete && <span className="tag is-light">Lecture des cartes…</span>}
				{main.blackjack && <span className="tag is-success">Blackjack</span>}
				{main.bust && <span className="tag is-danger">Bust</span>}
				{main.actions.map((action) => <span key={action} className="tag is-dark">{LIBELLES_ACTIONS[action] ?? action}</span>)}
			</div>
		</div>
	);
}

/**
 * Entrées : id du salon et fonction (seat_index) => libellé du siège;
 * sortie : le JSX de la vidéo de la table réelle et des mains lues par la caméra.
 * Reçoit en temps réel (Socket.IO) les images "frame" et l'état "tableCamera" envoyés par backend/tempsReel.js.
 */
function TableCamera({ salonId, libelleSiege = (siege) => `Siège ${siege + 1}` }) {
	const video = useRef(null);
	const [etat, setEtat] = useState(null);
	const [connecte, setConnecte] = useState(false);

	useEffect(() => {
		if (!salonId) return undefined;
		const socket = io(API_URL);
		let urlPrecedente = null;

		socket.on("connect", () => {
			setConnecte(true);
			socket.emit("rejoindre", salonId);
		});
		socket.on("disconnect", () => setConnecte(false));
		socket.on("tableCamera", setEtat);
		socket.on("frame", (jpeg) => {
			// On change directement la source de l'image : pas de re-render React 15 fois par seconde
			const url = URL.createObjectURL(new Blob([jpeg], { type: "image/jpeg" }));
			if (video.current) video.current.src = url;
			if (urlPrecedente) URL.revokeObjectURL(urlPrecedente);
			urlPrecedente = url;
		});

		return () => {
			socket.disconnect();
			if (urlPrecedente) URL.revokeObjectURL(urlPrecedente);
		};
	}, [salonId]);

	const cameraActive = connecte && etat?.camera;
	const croupier = etat?.table.croupier ?? [];
	const sieges = etat?.table.sieges ?? [];

	return (
		<div className="bj-camera mb-6">
			<div className="columns">
				<div className="column is-7">
					<div className="bj-camera-video">
						<img ref={video} alt="Vidéo en direct de la table" hidden={!cameraActive} />
						{!cameraActive && <p>{connecte ? "Caméra hors ligne" : "Connexion au serveur…"}</p>}
					</div>
				</div>
				<div className="column">
					<p className="has-text-weight-semibold mb-2">
						<span className="icon"><i className="fas fa-video" /></span> Table réelle
					</p>
					{cameraActive && croupier.length === 0 && sieges.length === 0 && <p>Aucune carte sur la table.</p>}
					<div className="bj-mains">
						{croupier.map((main, index) => <MainCamera key={`croupier-${index}`} main={main} libelle="Croupier" />)}
						{sieges.map((siege) => siege.mains.map((main, index) => (
							<MainCamera
								key={`${siege.seat_index}-${index}`}
								main={main}
								libelle={`${libelleSiege(siege.seat_index)}${siege.mains.length > 1 ? ` · Main ${index + 1}` : ""}`}
							/>
						)))}
					</div>
				</div>
			</div>
		</div>
	);
}

export default TableCamera;
