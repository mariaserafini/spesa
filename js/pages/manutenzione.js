// ============================================================
// MANUTENZIONE.JS — prodotti/negozi da aggiornare
// ============================================================

async function renderManutenzione() {
    document.getElementById('app').innerHTML = `
        <div class="page-header">
            <h1>Manutenzione</h1>
            <p>Prodotti e negozi con dati da aggiornare.</p>
        </div>
        <div class="foto-loading" id="loadingManu" style="display:flex; margin-top:1rem">
            <div class="spinner"></div><span>Carico…</span>
        </div>
        <div id="risultatiManu" style="display:none"></div>
    `;

    const oggi = new Date();
    const seimesifa = new Date(); seimesifa.setMonth(oggi.getMonth() - 6);
    const unannofa  = new Date(); unannofa.setFullYear(oggi.getFullYear() - 1);
    const soglia6m  = seimesifa.toISOString().slice(0, 10);
    const soglia1a  = unannofa.toISOString().slice(0, 10);

    // Tutte le rilevazioni con data + prodotto + negozio
    const { data: prezzi } = await supabaseClient
        .from('prezzi')
        .select('id, fkprodotto, fknegozio, datarilevazione, prodotti(id, nome), negozi(id, nome, filiale)');

    document.getElementById('loadingManu').style.display = 'none';
    document.getElementById('risultatiManu').style.display = 'block';

    if (!prezzi || prezzi.length === 0) {
        document.getElementById('risultatiManu').innerHTML = `<p class="text-muted">Nessun dato disponibile.</p>`;
        return;
    }

    // ---- Per prodotto: ultima data di rilevazione ----
    const ultimaPerProdotto = {};   // fkprodotto → { data, nome }
    const conteggioPerProdotto = {};

    for (const r of prezzi) {
        const id   = r.fkprodotto;
        const nome = r.prodotti.nome;
        conteggioPerProdotto[id] = (conteggioPerProdotto[id] || 0) + 1;
        if (!ultimaPerProdotto[id] || r.datarilevazione > ultimaPerProdotto[id].data) {
            ultimaPerProdotto[id] = { data: r.datarilevazione, nome };
        }
    }

    // Prodotti con TUTTE le rilevazioni vecchie (> 6 mesi)
    const prodottiVecchi = Object.entries(ultimaPerProdotto)
        .filter(([, v]) => v.data < soglia6m)
        .map(([id, v]) => ({ id: parseInt(id), nome: v.nome, data: v.data, count: conteggioPerProdotto[id] }))
        .sort((a, b) => a.nome.localeCompare(b.nome));

    // Prodotti con poche rilevazioni (< 3)
    const prodottiPochi = Object.entries(conteggioPerProdotto)
        .filter(([, c]) => c < 3)
        .map(([id, c]) => ({ id: parseInt(id), nome: ultimaPerProdotto[id]?.nome || '?', count: c }))
        .sort((a, b) => a.nome.localeCompare(b.nome));

    // ---- Per negozio: conteggio rilevazioni vecchie ----
    const statoNegozio = {}; // fknegozio → { nome, filiale, vecchie(>1a), meno_recenti(6m-1a) }
    for (const r of prezzi) {
        const id = r.fknegozio;
        if (!statoNegozio[id]) {
            statoNegozio[id] = {
                id,
                nome: r.negozi.nome,
                filiale: r.negozi.filiale,
                vecchie: 0,
                menoRecenti: 0,
                totale: 0,
            };
        }
        statoNegozio[id].totale++;
        if (r.datarilevazione < soglia1a)      statoNegozio[id].vecchie++;
        else if (r.datarilevazione < soglia6m) statoNegozio[id].menoRecenti++;
    }

    const negoziFiltrati = Object.values(statoNegozio)
        .filter(n => n.vecchie > 0 || n.menoRecenti > 0)
        .sort((a, b) => a.nome.localeCompare(b.nome));

    // ---- Render ----
    const wrap = document.getElementById('risultatiManu');

    function sezioneHtml(titolo, descrizione, righeHtml) {
        return `
            <div class="card manu-card">
                <div class="manu-titolo">${titolo}</div>
                <div class="manu-descr text-muted">${descrizione}</div>
                <div class="manu-lista">${righeHtml}</div>
            </div>
        `;
    }

    // Box 1: prodotti vecchi
    let html1 = '';
    if (prodottiVecchi.length === 0) {
        html1 = `<p class="text-muted" style="padding:.5rem 0">Nessun prodotto da aggiornare 👍</p>`;
    } else {
        html1 = prodottiVecchi.map(p => {
            const { testo } = calcolaEtaTesto(p.data);
            return `
                <div class="manu-riga">
                    <div class="manu-riga-info">
                        <span class="manu-nome">${p.nome}</span>
                        <span class="text-muted manu-eta">ultima: ${testo}</span>
                    </div>
                    <button class="btn-link manu-link" data-tipo="controlla" data-id="${p.id}">Controlla →</button>
                </div>`;
        }).join('');
    }

    // Box 2: prodotti pochi
    let html2 = '';
    if (prodottiPochi.length === 0) {
        html2 = `<p class="text-muted" style="padding:.5rem 0">Tutti i prodotti hanno almeno 3 rilevazioni 👍</p>`;
    } else {
        html2 = prodottiPochi.map(p => `
            <div class="manu-riga">
                <div class="manu-riga-info">
                    <span class="manu-nome">${p.nome}</span>
                    <span class="badge badge-unico" style="font-size:.7rem; padding:.1rem .4rem">${p.count}</span>
                </div>
                <button class="btn-link manu-link" data-tipo="controlla" data-id="${p.id}">Controlla →</button>
            </div>`).join('');
    }

    // Box 3: negozi con rilevazioni datate
    let html3 = '';
    if (negoziFiltrati.length === 0) {
        html3 = `<p class="text-muted" style="padding:.5rem 0">Tutti i negozi sono aggiornati 👍</p>`;
    } else {
        html3 = negoziFiltrati.map(n => {
            const label = n.filiale ? `${n.nome} (${n.filiale})` : n.nome;
            const vecchieHtml     = n.vecchie     > 0 ? `<span class="badge badge-vecchio">${n.vecchie} vecchie (&gt;1a)</span>` : '';
            const menoRecentiHtml = n.menoRecenti > 0 ? `<span class="badge badge-inattendibile">${n.menoRecenti} datate (6m-1a)</span>` : '';
            return `
                <div class="manu-riga">
                    <div class="manu-riga-info">
                        <span class="manu-nome">${label}</span>
                        <div class="manu-badges">${vecchieHtml}${menoRecentiHtml}</div>
                    </div>
                    <button class="btn-link manu-link" data-tipo="analizza" data-id="${n.id}" data-nome="${n.nome}" data-filiale="${n.filiale || ''}">Analizza →</button>
                </div>`;
        }).join('');
    }

    wrap.innerHTML =
        sezioneHtml('⏰ Prodotti con dati vecchi', 'Tutte le rilevazioni risalgono a più di 6 mesi fa.', html1) +
        sezioneHtml('📊 Prodotti con poche rilevazioni', 'Meno di 3 rilevazioni in totale.', html2) +
        sezioneHtml('🏪 Negozi con rilevazioni datate', 'Rilevazioni tra 6 mesi e 1 anno fa, o oltre 1 anno.', html3);

    // ---- Listener link ----
    wrap.addEventListener('click', e => {
        const btn = e.target.closest('.manu-link');
        if (!btn) return;
        const tipo = btn.dataset.tipo;
        const id   = parseInt(btn.dataset.id);

        if (tipo === 'controlla') {
            // Carica il prodotto dal DOM e naviga
            const nome = btn.closest('.manu-riga').querySelector('.manu-nome').textContent;
            navigate('controlla').then(() => {
                // Pre-compila il campo cercaProdotto
                const input = document.getElementById('inputCercaProdotto');
                if (input) {
                    input.value = nome;
                    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                }
            });
        }

        if (tipo === 'analizza') {
            navigate('analizza', {
                negozio: { id, nome: btn.dataset.nome, filiale: btn.dataset.filiale || null }
            });
        }
    });
}
