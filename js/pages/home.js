// ============================================================
// HOME.JS — top 3 negozi per rilevazioni con link ad analizza
// ============================================================

async function renderHome() {
    document.getElementById('app').innerHTML = `
        <div class="page-header">
            <h1>Price Tracker</h1>
            <p>I negozi con più rilevazioni recenti.</p>
        </div>
        <div class="home-negozi" id="homeNegozi">
            <div class="foto-loading" style="display:flex">
                <div class="spinner"></div>
                <span>Carico…</span>
            </div>
        </div>
    `;

    // Conta rilevazioni per negozio (ultimi 6 mesi)
    const seimesifa = new Date();
    seimesifa.setMonth(seimesifa.getMonth() - 6);
    const soglia = seimesifa.toISOString().slice(0, 10);

    const { data: righe } = await supabaseClient
        .from('prezzi')
        .select('fknegozio, negozi(id, nome, filiale)')
        .gte('datarilevazione', soglia);

    const wrap = document.getElementById('homeNegozi');

    if (!righe || righe.length === 0) {
        wrap.innerHTML = `<p class="text-muted">Nessuna rilevazione negli ultimi 6 mesi.</p>`;
        return;
    }

    // Conta per negozio
    const conteggi = {};
    const nomiNegozi = {};
    for (const r of righe) {
        const id = r.fknegozio;
        conteggi[id] = (conteggi[id] || 0) + 1;
        nomiNegozi[id] = r.negozi;
    }

    const top3 = Object.entries(conteggi)
        .sort((a, b) => b[1] - a[1])
        .map(([id, count]) => ({ negozio: nomiNegozi[id], count }));

    wrap.innerHTML = top3.map(({ negozio, count }) => {
        const label = negozio.filiale ? `${negozio.nome}<span class="home-filiale">${negozio.filiale}</span>` : negozio.nome;
        return `
            <button class="home-negozio-btn" data-id="${negozio.id}">
                <div class="home-negozio-nome">${label}</div>
                <div class="home-negozio-count">${count} rilevazioni</div>
            </button>
        `;
    }).join('');

    // Mappa id → oggetto negozio per navigare
    wrap.addEventListener('click', e => {
        const btn = e.target.closest('.home-negozio-btn');
        if (!btn) return;
        const id = parseInt(btn.dataset.id);
        const { negozio } = top3.find(t => t.negozio.id === id);
        navigate('analizza', { negozio });
    });
}
