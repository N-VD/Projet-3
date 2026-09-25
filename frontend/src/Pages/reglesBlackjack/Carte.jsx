import { SYMBOLES } from "./constantes.js";

function Carte({ carte, delai = null, retournement = null }) {
	const rouge = carte.couleur === "coeur" || carte.couleur === "carreau";
	return (
		<div
			className={`bj-carte ${delai !== null ? "bj-distribuee" : ""} ${carte.cachee ? "est-cachee" : ""}`}
			style={{ "--delai": `${delai ?? 0}s`, "--delai-retournement": `${retournement ?? 0}s` }}
			aria-label={carte.cachee ? "Carte cachée" : `${carte.rang} de ${carte.couleur}`}
		>
			<div className="bj-carte-interieur">
				<div className={`bj-face bj-recto ${rouge ? "bj-rouge" : ""}`}>
					{!carte.cachee && <>
						<span className="bj-coin">{carte.rang}<br />{SYMBOLES[carte.couleur]}</span>
						<span className="bj-centre">{SYMBOLES[carte.couleur]}</span>
						<span className="bj-coin bj-bas">{carte.rang}<br />{SYMBOLES[carte.couleur]}</span>
					</>}
				</div>
				<div className="bj-face bj-verso" />
			</div>
		</div>
	);
}

export default Carte;