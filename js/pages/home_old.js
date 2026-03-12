// ============================================================
// HOME.JS — pagina iniziale
// ============================================================

function renderHome() {
    document.getElementById('app').innerHTML = `
        <div class="home-hero">
            <h1>Cosa fai oggi?</h1>
            <p>Tieni traccia dei prezzi e compra sempre al meglio.</p>
        </div>
        <div class="actions">
            <div class="action-card" onclick="navigate('rileva-manuale')">
                <div class="action-icon">✏️</div>
                <div class="action-title">Rileva manuale</div>
                <div class="action-desc">Inserisci un prezzo visto al supermercato</div>
            </div>
            <div class="action-card" onclick="navigate('rileva-foto')">
                <div class="action-icon">📷</div>
                <div class="action-title">Rileva da foto</div>
                <div class="action-desc">Scatta una foto al cartellino, ci pensa Gemini</div>
            </div>
            <div class="action-card" onclick="navigate('controlla')">
                <div class="action-icon">🔍</div>
                <div class="action-title">Controlla</div>
                <div class="action-desc">Cerca un prodotto e confronta i prezzi</div>
            </div>
            <div class="action-card" onclick="navigate('analizza')">
                <div class="action-icon">📊</div>
                <div class="action-title">Analizza</div>
                <div class="action-desc">Scopri dove conviene fare la spesa</div>
            </div>
        </div>
    `;
}
