import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AuthPopup from '../Pages/AuthPopup';

test("Ne s'affiche pas si l'utilisateur est connecté (isLoggedIn = true)", () => {
    render(
      <MemoryRouter>
        <AuthPopup isLoggedIn={true} />
      </MemoryRouter>
    );
    
    // Le modal ne doit pas être présent dans le DOM si l'utilisateur est déjà connecté
    expect(screen.queryByRole('heading', { name: /bienvenue sur bellevibe casino/i })).not.toBeInTheDocument();
});

test("S'affiche correctement lorsque l'utilisateur n'est pas connecté (isLoggedIn = false)", () => {
    render(
      <MemoryRouter>
        <AuthPopup isLoggedIn={false} />
      </MemoryRouter>
    );
    
    // Vérification du titre principal
    expect(screen.getByRole('heading', { name: /bienvenue sur bellevibe casino/i })).toBeInTheDocument();
    
    // Vérification de la présence des trois options
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /s'inscrire/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continuer en tant qu'invité/i })).toBeInTheDocument();
});

test("Déclenche l'action au clic sur Continuer en tant qu'invité", () => {
    render(
      <MemoryRouter>
        <AuthPopup isLoggedIn={false} />
      </MemoryRouter>
    );
    
    const boutonInvite = screen.getByRole('button', { name: /continuer en tant qu'invité/i });
    expect(boutonInvite).toBeInTheDocument();
    
    fireEvent.click(boutonInvite);
});