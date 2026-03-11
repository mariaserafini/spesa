// ============================================================
// AUTH.JS — gestione sessione
// ============================================================

async function getSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session;
}

async function login(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
}
