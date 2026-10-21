import { Link } from "react-router-dom";

const JEUX = [
	{
		id: "blackjack",
		nom: "Blackjack",
		resume: "Cartes · Contre le croupier",
		description: "Approchez-vous le plus possible de 21 sans dépasser et battez le croupier. Le blackjack paie 3 pour 2.",
		icone: "fas fa-clone",
		lien: "/jeux/blackjack",
	},
];

function App({ isLoggedIn }) {
	return (
		<div>
			<section className="hero is-primary is-light is-medium">
				<div className="hero-body">
					<div className="container has-text-centered">
						<h1 className="title is-2">Bienvenue sur Projet-3</h1>
						<p className="subtitle">
							{isLoggedIn
								? "Content de vous revoir !"
								: "Vous naviguez en tant qu'invité. Connectez-vous pour profiter de toutes les fonctionnalités."}
						</p>
						{!isLoggedIn && (
							<div className="buttons is-centered">
								<Link to="/register" className="button is-primary">
									Créer un compte
								</Link>
								<Link to="/login" className="button is-primary is-outlined">
									Se connecter
								</Link>
							</div>
						)}
					</div>
				</div>
			</section>

			<section className="section">
				<div className="container">
					<h2 className="title is-3">Nos jeux</h2>
					<div className="columns is-multiline">
						{JEUX.map((jeu) => (
							<div key={jeu.id} className="column is-one-third-desktop is-half-tablet">
								<div className="card" style={{ height: "100%" }}>
									<div className="card-content">
										<div className="media">
											<div className="media-left">
												<span className="icon is-large has-text-primary">
													<i className={`${jeu.icone} fa-2x`} />
												</span>
											</div>
											<div className="media-content">
												<p className="title is-4">{jeu.nom}</p>
												<p className="subtitle is-6">{jeu.resume}</p>
											</div>
										</div>
										<p>{jeu.description}</p>
									</div>
									<footer className="card-footer">
										{isLoggedIn ? (
											<Link to={jeu.lien} className="card-footer-item has-text-weight-bold">
												Jouer
											</Link>
										) : (
											<>
												<Link to="/login" className="card-footer-item">
													Se connecter pour jouer
												</Link>
												<Link to="/spectateur" className="card-footer-item">
													Regarder une partie
												</Link>
											</>
										)}
									</footer>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>
		</div>
	);
}

export default App;
