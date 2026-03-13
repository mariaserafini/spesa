// ============================================================
// ROUTER.JS — navigazione SPA
// Per aggiungere una nuova pagina:
//   1. Crea js/pages/nome-pagina.js con una funzione renderNomePagina()
//   2. Aggiungi la voce in ROUTES qui sotto
//   3. Aggiungi il <script> in index.html
// ============================================================

const ROUTES = {
    'home': renderHome,
    'rileva-manuale': renderRilevaManuale,
    'rileva-foto': renderRilevaFoto,
    'controlla': renderControlla,
    'analizza': renderAnalizza,
    'spesa': renderSpesa,
    'manutenzione': renderManutenzione,
};

let paginaCorrente = null;

async function navigate(pagina, dati = null) {
    // Usa home come fallback
    const render = ROUTES[pagina] || ROUTES['home'];
    paginaCorrente = pagina;

    // Rianima il contenuto ad ogni navigazione
    const app = document.getElementById('app');
    app.style.animation = 'none';
    app.offsetHeight; // reflow
    app.style.animation = '';

    await render(dati);
    window.location.hash = pagina;
}

// All'avvio legge l'hash dall'URL (es. #rileva-manuale)
async function initRouter() {
    const session = await getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // Mostra l'app solo dopo aver verificato la sessione
    document.body.style.visibility = 'visible';
    renderNavbar();

    const hash = window.location.hash.replace('#', '') || 'home';
    await navigate(hash);
}

// Gestisce il tasto Indietro del browser
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '') || 'home';
    if (hash !== paginaCorrente) navigate(hash);
});
