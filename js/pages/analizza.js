// ============================================================
// ANALIZZA.JS — analisi convenienza per negozio
// ============================================================

async function renderAnalizza(datiIniziali = null) {
    document.getElementById('app').innerHTML = `
        <div class="page-header">
            <h1>Analizza</h1>
        </div>

        <div class="card">
            <div class="field">
                <label for="inputCercaNegozio">Negozio</label>
                <div class="ac-wrapper">
                    <input type="text" id="inputCercaNegozio"
                           placeholder="es. Lidl, Koro, Dm…"
                           autocomplete="off" />
                    <div class="ac-dropdown" id="dropdownNegozioAnalizza"></div>
                </div>
            </div>
        </div>

        <div id="risultatiAnalizza"></div>
    `;

    await initAnalizza(datiIniziali);
}

async function initAnalizza(datiIniziali = null) {
    const { data: negozi, error } = await supabaseClient
        .from('negozi')
        .select('id, nome, filiale')
        .order('nome');

    if (error) { console.error(error); return; }

    let negozioCorrente = null;

    creaAutocomplete({
        input: document.getElementById('inputCercaNegozio'),
        dropdown: document.getElementById('dropdownNegozioAnalizza'),
        lista: negozi,
        mostraNuovo: false,
        onSelect: (negozio) => {
            negozioCorrente = negozio;
            analizzaNegozio(negozio);
        },
        onNuovo: () => { }
    });

    document.getElementById('inputCercaNegozio').addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const testo = normalizzaNegozio(e.target.value);
        if (!testo) return;
        const match = negozi.find(n => n.nome.toLowerCase().includes(testo.toLowerCase()));
        if (match) {
            e.target.value = match.nome;
            document.getElementById('dropdownNegozioAnalizza').style.display = 'none';
            negozioCorrente = match;
            analizzaNegozio(match);
        }
    });

    // Pre-seleziona negozio se arriva da navigazione
    if (datiIniziali && datiIniziali.negozio) {
        const match = negozi.find(n => n.id === datiIniziali.negozio.id);
        if (match) {
            document.getElementById('inputCercaNegozio').value = match.nome;
            negozioCorrente = match;
            analizzaNegozio(match);
        }
    }
}

// ---- Logica principale ----
async function analizzaNegozio(negozio) {
    const contenitore = document.getElementById('risultatiAnalizza');
    contenitore.innerHTML = `
        <div class="foto-loading" style="display:flex; margin-top:1.5rem">
            <div class="spinner"></div>
            <span>Analizzo i prezzi…</span>
        </div>
    `;

    const seimesifa = new Date();
    seimesifa.setMonth(seimesifa.getMonth() - 6);
    const soglia = seimesifa.toISOString().slice(0, 10);

    // Tutte le rilevazioni recenti (ultimi 6 mesi) — per calcolare il minimo globale
    const { data: tutteRecenti, error: e1 } = await supabaseClient
        .from('prezzi')
        .select('id, fkprodotto, fknegozio, variante, prezzounita, datarilevazione, negozi(nome, filiale), prodotti(nome, unita)')
        .gte('datarilevazione', soglia);

    // Tutte le rilevazioni del negozio selezionato (qualsiasi data)
    const { data: righeNegozio, error: e2 } = await supabaseClient
        .from('prezzi')
        .select('id, fkprodotto, variante, prezzo, quantita, unita, prezzounita, promozione, note, datarilevazione, prodotti(nome, unita)')
        .eq('fknegozio', negozio.id);

    if (e1 || e2) {
        contenitore.innerHTML = `<div class="msg msg-error visible" style="margin-top:1rem">Errore nel caricamento. Riprova.</div>`;
        return;
    }

    // Conteggio totale rilevazioni per prodotto (tutti i negozi, qualsiasi data)
    const { data: conteggioTutte } = await supabaseClient
        .from('prezzi')
        .select('fkprodotto');

    const conteggioPerProdotto = {};
    for (const r of (conteggioTutte || [])) {
        conteggioPerProdotto[r.fkprodotto] = (conteggioPerProdotto[r.fkprodotto] || 0) + 1;
    }

    // ---- Calcola minimo globale per prodotto+variante (ultimi 6 mesi) ----
    // chiave: "fkprodotto|variante"
    const minimoGlobale = {}; // chiave → { prezzounita, negozio, data }
    for (const r of (tutteRecenti || [])) {
        const k = `${r.fkprodotto}|${r.variante ?? ''}`;
        if (!minimoGlobale[k] || r.prezzounita < minimoGlobale[k].prezzounita) {
            minimoGlobale[k] = {
                prezzounita: r.prezzounita,
                negozioNome: r.negozi.filiale ? `${r.negozi.nome} (${r.negozi.filiale})` : r.negozi.nome,
                data: r.datarilevazione,
            };
        }
    }

    // ---- Classifica le rilevazioni del negozio ----
    const daComprare = [];
    const potrestiComprare = [];
    const nonComprare = [];
    const daControllare = [];

    for (const r of (righeNegozio || [])) {
        const k = `${r.fkprodotto}|${r.variante ?? ''}`;
        const recente = r.datarilevazione >= soglia;
        const nomeProdotto = r.prodotti.nome;
        const unitaBase = r.prodotti.unita;
        const conteggio = conteggioPerProdotto[r.fkprodotto] || 1;
        const min = minimoGlobale[k];

        const item = {
            id: r.id,
            fkprodotto: r.fkprodotto,
            nome: nomeProdotto,
            variante: r.variante,
            prezzo: r.prezzo,
            quantita: r.quantita,
            unita: r.unita,
            prezzounita: r.prezzounita,
            note: r.note,
            promozione: r.promozione,
            unitaBase,
            data: r.datarilevazione,
            conteggio,
            min,
        };

        if (!recente) {
            daControllare.push(item);
            continue;
        }

        if (!min) {
            // Solo rilevazione è questa — è automaticamente la migliore
            daComprare.push(item);
            continue;
        }

        const scarto = (r.prezzounita - min.prezzounita) / min.prezzounita;

        if (scarto <= 0.001) {          // è il minimo (tolleranza floating point)
            daComprare.push(item);
        } else if (scarto <= 0.10) {    // entro il 10%
            potrestiComprare.push(item);
        } else {                         // oltre il 10%
            nonComprare.push(item);
        }
    }

    // Ordine alfabetico in ogni box
    const alfa = (a, b) => a.nome.localeCompare(b.nome);
    daComprare.sort(alfa);
    potrestiComprare.sort(alfa);
    nonComprare.sort(alfa);
    daControllare.sort(alfa);

    // ---- Render ----
    const negozioLabel = negozio.filiale ? `${negozio.nome} (${negozio.filiale})` : negozio.nome;

    contenitore.innerHTML = `
        <div class="analizza-header">
            <div>
                <h2>${negozioLabel}</h2>
                <span class="text-muted" style="font-size:.85rem">
                    Confronto su rilevazioni degli ultimi 6 mesi
                </span>
            </div>
            <button class="btn btn-primary btn-sm analizza-btn-rileva"
                    id="btnRilevaAnalizza"
                    title="Aggiungi una rilevazione per questo negozio">
                + Rileva
            </button>
        </div>
        <div class="analizza-boxes" id="analizzaBoxes"></div>
    `;

    document.getElementById('btnRilevaAnalizza').addEventListener('click', () => {
        navigate('rileva-manuale', { nomeNegozio: negozio.nome });
    });

    const boxesWrap = document.getElementById('analizzaBoxes');

    const configs = [
        { lista: daComprare, titolo: '🛒 Da comprare', classe: 'box-verde', mostraMin: false },
        { lista: potrestiComprare, titolo: '🤔 Potresti comprare', classe: 'box-giallo', mostraMin: true },
        { lista: nonComprare, titolo: '🚫 Non comprare', classe: 'box-rosso', mostraMin: true },
        { lista: daControllare, titolo: '⏰ Da controllare', classe: 'box-grigio', mostraMin: true },
    ];

    for (const { lista, titolo, classe, mostraMin } of configs) {
        if (lista.length === 0) continue;

        const sezione = document.createElement('div');
        sezione.className = 'controlla-sezione card';

        const unitaBase = lista[0]?.unitaBase || 'unità';

        const righeHtml = lista.map(item => {
            const unico = item.conteggio === 1;
            const badgeHtml = unico
                ? `<span class="badge badge-unico" title="Unica rilevazione disponibile">!</span>`
                : `<span class="analizza-count" title="${item.conteggio} rilevazioni totali">${item.conteggio}</span>`;
            const promoHtml = item.promozione ? `<span class="badge badge-promo">promo</span>` : '';
            const varHtml = item.variante ? `<div class="controlla-note">${item.variante}</div>` : '';
            const noteHtml = item.note ? `<div class="controlla-note">${item.note}</div>` : '';

            const { testo: tempoTesto, badge: tempoBadge } = calcolaEtaTesto(item.data);
            const scartoPct = item.min && item.prezzounita > item.min.prezzounita
                ? `<div class="controlla-scarto">+${Math.round((item.prezzounita - item.min.prezzounita) / item.min.prezzounita * 100)}%</div>`
                : '';
            const formatoMobile = item.quantita ? `<span class="controlla-formato-mobile">${item.quantita}${item.unita}</span>` : '';

            let minHtml = '';
            if (mostraMin && item.min) {
                const { testo: tempoMin } = calcolaEtaTesto(item.min.data);
                minHtml = `<div class="controlla-note">min: <strong>€ ${parseFloat(item.min.prezzounita).toFixed(2)}/${item.unitaBase}</strong> @ ${item.min.negozioNome} · ${tempoMin}</div>`;
            } else if (mostraMin && !item.min) {
                minHtml = `<div class="controlla-note text-muted">Nessun altro prezzo recente</div>`;
            }

            return `
                <tr data-id="${item.id}">
                    <td>
                        <div class="controlla-negozio analizza-nome-row"><button class="btn-nome spesa-btn-controlla" data-prodotto-nome="${item.nome}">${item.nome}</button>${badgeHtml}</div>
                        ${varHtml}${noteHtml}
                        ${minHtml}
                    </td>
                    <td class="controlla-prezzo-unita">
                        <div class="prezzo-col">€ ${parseFloat(item.prezzounita).toFixed(2)}${formatoMobile}${scartoPct}</div>
                    </td>
                    <td class="controlla-prezzo-formato">
                        ${item.quantita}${item.unita} <br> (€ ${parseFloat(item.prezzo).toFixed(2)})
                    </td>
                    <td class="controlla-col-azioni">
                        <div class="controlla-tempo">${tempoTesto} ${tempoBadge}</div>
                        <div class="controlla-badges-row">
                            ${promoHtml}
                            <button class="btn-azione btn-conferma" data-id="${item.id}" title="Prezzo ancora valido — aggiorna solo la data">✓</button>
                            <button class="btn-azione btn-aggiorna" data-id="${item.id}" title="Modifica dati">✎</button>
                        </div>
                    </td>
                </tr>
                <tr class="controlla-edit-row" id="edit-${item.id}" style="display:none">
                    <td colspan="4">
                        <div class="controlla-edit-box">
                            <div class="controlla-edit-fields">
                                <div class="field">
                                    <label>Prezzo (€)</label>
                                    <input type="number" class="edit-prezzo" value="${item.prezzo}" min="0" step="0.01" />
                                </div>
                                <div class="field">
                                    <label>Quantità</label>
                                    <input type="number" class="edit-quantita" value="${item.quantita}" min="0" step="any" />
                                </div>
                                <div class="field">
                                    <label>Unità</label>
                                    <select class="edit-unita">
                                        ${['g', 'kg', 'mg', 'ml', 'cl', 'dl', 'l', 'pz'].map(u =>
                `<option value="${u}" ${u === item.unita ? 'selected' : ''}>${u}</option>`
            ).join('')}
                                    </select>
                                </div>
                                <div class="field">
                                    <label>Variante</label>
                                    <input type="text" class="edit-variante" value="${item.variante || ''}" placeholder="nessuna" />
                                </div>
                                <div class="field">
                                    <label>Promo</label>
                                    <select class="edit-promo">
                                        <option value="false" ${!item.promozione ? 'selected' : ''}>No</option>
                                        <option value="true"  ${item.promozione ? 'selected' : ''}>Sì</option>
                                    </select>
                                </div>
                                <div class="field edit-field-note">
                                    <label>Note</label>
                                    <input type="text" class="edit-note" value="${item.note || ''}" placeholder="opzionale" />
                                </div>
                            </div>
                            <div class="controlla-edit-actions">
                                <button class="btn btn-primary btn-sm btn-salva-edit" data-id="${item.id}">Salva</button>
                                <button class="btn btn-ghost   btn-sm btn-annulla-edit" data-id="${item.id}">Annulla</button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        sezione.innerHTML = `
            <div class="controlla-variante-titolo ${classe}-titolo">${titolo} <span class="analizza-box-count">${lista.length}</span></div>
            <div class="table-responsive">
                <table class="results-table controlla-table">
                    <thead>
                        <tr>
                            <th>Prodotto</th>
                            <th>€ / ${unitaBase}</th>
                            <th>Formato</th>
                            <th>Rilevazione</th>
                        </tr>
                    </thead>
                    <tbody>${righeHtml}</tbody>
                </table>
            </div>
        `;

        boxesWrap.appendChild(sezione);
    }
    // ---- Listener pulsanti conferma/aggiorna ----
    boxesWrap.addEventListener('click', async (e) => {

        // CONFERMA
        if (e.target.classList.contains('btn-conferma')) {
            const id = e.target.dataset.id;
            const btn = e.target;
            btn.disabled = true; btn.textContent = '…';
            const { error } = await supabaseClient
                .from('prezzi')
                .update({ datarilevazione: new Date().toISOString().slice(0, 10) })
                .eq('id', id);
            if (error) {
                btn.textContent = '✗'; btn.style.color = 'red';
            } else {
                btn.textContent = '✓';
                btn.style.background = '#e2efda'; btn.style.color = '#276228';
                // Aggiorna il testo della data nella riga
                const tr = boxesWrap.querySelector(`tr[data-id="${id}"]`);
                const tempoEl = tr?.querySelector('.controlla-tempo');
                if (tempoEl) tempoEl.innerHTML = 'oggi';
            }
            btn.disabled = false;
        }

        // Vai a Controlla
        if (e.target.closest('.spesa-btn-controlla')) {
            const nome = e.target.closest('.spesa-btn-controlla').dataset.prodottoNome;
            await navigate('controlla');
            const input = document.getElementById('inputCercaProdotto');
            if (input) { input.value = nome; input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }
            return;
        }

        // TOGGLE FORM AGGIORNA
        if (e.target.classList.contains('btn-aggiorna')) {
            const id = e.target.dataset.id;
            const editBox = document.getElementById(`edit-${id}`);
            const visibile = editBox.style.display !== 'none';
            editBox.style.display = visibile ? 'none' : 'block';
            e.target.textContent = visibile ? '✎' : '✕';
        }

        // ANNULLA
        if (e.target.classList.contains('btn-annulla-edit')) {
            const id = e.target.dataset.id;
            document.getElementById(`edit-${id}`).style.display = 'none';
            const btnAgg = boxesWrap.querySelector(`.btn-aggiorna[data-id="${id}"]`);
            if (btnAgg) btnAgg.textContent = '✎';
        }

        // SALVA
        if (e.target.classList.contains('btn-salva-edit')) {
            const id = e.target.dataset.id;
            const editBox = document.getElementById(`edit-${id}`);
            const prezzo = parseFloat(editBox.querySelector('.edit-prezzo').value);
            const quantita = parseFloat(editBox.querySelector('.edit-quantita').value);
            const unita = editBox.querySelector('.edit-unita').value;
            const variante = editBox.querySelector('.edit-variante').value.trim().toLowerCase() || null;
            const promo = editBox.querySelector('.edit-promo').value === 'true';
            const note = editBox.querySelector('.edit-note').value.trim() || null;

            if (isNaN(prezzo) || isNaN(quantita) || !unita) {
                alert('Compila prezzo, quantità e unità.'); return;
            }
            const prezzounita = calcolaPrezzoPer(prezzo, quantita, unita);
            const btn = e.target;
            btn.disabled = true; btn.textContent = '…';

            const { error } = await supabaseClient
                .from('prezzi')
                .update({
                    prezzo, quantita, unita, prezzounita, variante, promozione: promo, note,
                    datarilevazione: new Date().toISOString().slice(0, 10)
                })
                .eq('id', id);

            if (error) {
                btn.disabled = false; btn.textContent = 'Salva';
                alert('Errore nel salvataggio. Riprova.');
            } else {
                analizzaNegozio(negozio);
            }
        }
    });
}