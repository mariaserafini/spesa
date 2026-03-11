// ============================================================
// AUTH.JS — gestione sessione e protezione pagine
// ============================================================

// Da chiamare in cima a ogni pagina PROTETTA.
// Nasconde il body finché la sessione non è verificata.
async function requireAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        // Non loggato → vai al login senza mostrare nulla
        window.location.replace('login.html');
        return null;
    }
    // Loggato → mostra la pagina
    document.body.style.visibility = 'visible';
    return session;
}

// Da chiamare SOLO su login.html.
// Se già loggato → redirect alla home. Altrimenti mostra il form.
async function redirectIfLoggedIn() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.replace('index.html');
    } else {
        // Non loggato → mostra la pagina di login
        document.body.style.visibility = 'visible';
    }
}

async function login(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.replace('login.html');
}
