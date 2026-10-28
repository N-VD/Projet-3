function valeurMain(cartes = []) {
    let total = 0;
    let as = 0;
    for (const carte of cartes) {

        if (!carte || !carte.rang) continue;// Sécurité : si la carte est null ou undefined, on l'ignore
        total += carte.rang === 'A' ? 11 : ['J', 'Q', 'K'].includes(carte.rang) ? 10 : Number(carte.rang);
        if (carte.rang === 'A') as++;
    }
    while (total > 21 && as > 0) {
        total -= 10;
        as--;
    }
    return total;
}

function retourJoueur(player, dealerHand) {
    const totalCroupier = valeurMain(dealerHand);
    const blackjackCroupier = dealerHand?.length === 2 && totalCroupier === 21;
    const mains = Array.isArray(player.hands) && player.hands.length > 0
        ? player.hands
        : [{ cartes: player.hand, mise: player.bet, naturel: player.status === 'blackjack' }];

    return Math.round(mains.reduce((totalRetour, main) => {
        const cartes = main.cartes || [];
        const totalJoueur = valeurMain(cartes);
        const mise = Math.round(Number(main.mise ?? player.bet) * 100) / 100;
        const blackjackJoueur = Boolean(main.naturel) && cartes.length === 2 && totalJoueur === 21;
        let retour = 0;

        if (!Number.isFinite(mise) || mise <= 0) return totalRetour;
        if (totalJoueur > 21 || blackjackCroupier && !blackjackJoueur) retour = 0;
        else if (blackjackJoueur && blackjackCroupier) retour = mise;
        else if (blackjackJoueur) retour = Math.round(mise * 2.5 * 100) / 100;
        else if (totalCroupier > 21 || totalJoueur > totalCroupier) retour = mise * 2;
        else if (totalJoueur === totalCroupier) retour = mise;

        return totalRetour + retour;
    }, 0) * 100) / 100;
}

module.exports = { retourJoueur, valeurMain };
