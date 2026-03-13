// ============================================================
// CONTROLLA.JS — cerca un prodotto e confronta i prezzi
// ============================================================

async function renderControlla() {
    document.getElementById('app').innerHTML = `
        <div class="page-header">
            <h1>Controlla</h1>
        </div>

        <div class="card">
            <div class="field">
                <label for="inputCercaProdotto">Prodotto</label>
                <div class="ac-wrapper">
                    <input type="text" id="inputCercaProdotto"
                           placeholder="es. noci, tahina, ceci…"
                           autocomplete="off" />
                    <div class="ac-dropdown" id="dropdownCerca"></div>
                </div>
            </div>
        </div>

        <div id="risultatiControlla"></div>
    `;

    await initControlla();
}

async function initControlla() {
    const { data: prodotti, error } = await supabaseClient
        .from('prodotti')
        .select('id, nome, categoria, unita')
        .order('nome');

    if (error) { console.error(error); return; }

    let prodottoCorrente = null;

    creaAutocomplete({
        input: document.getElementById('inputCercaProdotto'),
        dropdown: document.getElementById('dropdownCerca'),
        lista: prodotti,
        mostraNuovo: false,
        onSelect: (prodotto) => {
            prodottoCorrente = prodotto;
            cercaRilevazioni(prodotto);
        },
        onNuovo: () => { }
    });

    document.getElementById('inputCercaProdotto').addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const testo = normalizzaProdotto(e.target.value);
        if (!testo) return;
        const match = prodotti.find(p => p.nome.toLowerCase().includes(testo));
        if (match) {
            e.target.value = match.nome;
            document.getElementById('dropdownCerca').style.display = 'none';
            prodottoCorrente = match;
            cercaRilevazioni(match);
        }
    });
}

// ---- Recupera e mostra le rilevazioni ----
async function cercaRilevazioni(prodotto) {
    const contenitore = document.getElementById('risultatiControlla');
    contenitore.innerHTML = `
        <div class="foto-loading" style="display:flex; margin-top:1.5rem">
            <div class="spinner"></div>
            <span>Carico le rilevazioni…</span>
        </div>
    `;

    const { data: righe, error } = await supabaseClient
        .from('prezzi')
        .select('id, variante, prezzo, quantita, unita, prezzounita, promozione, datarilevazione, note, negozi(id, nome, filiale)')
        .eq('fkprodotto', prodotto.id)
        .order('prezzounita', { ascending: true });

    if (error) {
        contenitore.innerHTML = `<div class="msg msg-error visible" style="margin-top:1rem">Errore nel caricamento. Riprova.</div>`;
        return;
    }

    if (!righe || righe.length === 0) {
        contenitore.innerHTML = `
            <div class="card" style="margin-top:1rem">
                <p class="text-muted">Nessuna rilevazione trovata per <strong>${prodotto.nome}</strong>.</p>
            </div>
        `;
        return;
    }

    const gruppi = {};
    for (const r of righe) {
        const chiave = r.variante ?? '';
        if (!gruppi[chiave]) gruppi[chiave] = [];
        gruppi[chiave].push(r);
    }

    const variantiKeys = Object.keys(gruppi).sort();
    const unitaBase = prodotto.unita;

    contenitore.innerHTML = `
        <div class="analizza-header" style="margin-top:1.75rem; margin-bottom:1rem">
            <div>
                <h2>${prodotto.nome}</h2>
                <span class="text-muted" style="font-size:.85rem">${prodotto.categoria} · prezzo per ${unitaBase}</span>
            </div>
            <button class="btn btn-primary btn-sm" id="btnRilevaControlla"
                    title="Aggiungi una rilevazione per questo prodotto">+ Rileva</button>
        </div>
        <div class="controlla-varianti" id="controllaVarianti"></div>
    `;

    document.getElementById('btnRilevaControlla').addEventListener('click', () => {
        navigate('rileva-manuale', { nomeProdotto: prodotto.nome });
    });

    const wrap = document.getElementById('controllaVarianti');

    for (const chiave of variantiKeys) {
        const etichettaVariante = chiave || null;
        const righeVariante = gruppi[chiave];

        const sezione = document.createElement('div');
        sezione.className = 'controlla-sezione card';

        const titoloHtml = etichettaVariante
            ? `<div class="controlla-variante-titolo">${etichettaVariante}</div>`
            : (variantiKeys.length > 1 ? `<div class="controlla-variante-titolo controlla-variante-base">base</div>` : '');

        const righeHtml = righeVariante.map((r, i) => {
            const negozioLabel = r.negozi.filiale
                ? `<button class="btn-link controlla-btn-analizza" data-negozio-id="${r.negozi.id}" data-negozio-nome="${r.negozi.nome}">${r.negozi.nome}</button> <span class="text-muted">(${r.negozi.filiale})</span>`
                : `<button class="btn-link controlla-btn-analizza" data-negozio-id="${r.negozi.id}" data-negozio-nome="${r.negozi.nome}">${r.negozi.nome}</button>`;

            const { testo: tempoTesto, badge: tempoBadge } = calcolaEtaTesto(r.datarilevazione);
            const promoHtml = r.promozione ? `<span class="badge badge-promo">promo</span>` : '';
            const bestHtml = i === 0 ? `<span class="badge badge-best">migliore</span>` : '';
            const prezzoUnitaLabel = `€ ${parseFloat(r.prezzounita).toFixed(2)}`;
            const noteHtml = r.note ? `<div class="controlla-note">${r.note}</div>` : '';

            return `
                <tr data-id="${r.id}" class="${i === 0 ? 'controlla-best' : ''}">
                    <td>
                        <div class="controlla-negozio">${negozioLabel}</div>
                        ${noteHtml}
                    </td>
                    <td class="controlla-prezzo-unita">${prezzoUnitaLabel}</td>
                    <td class="controlla-prezzo-formato">
                        ${r.quantita}${r.unita} <br> (€ ${parseFloat(r.prezzo).toFixed(2)})
                    </td>
                    <td class="controlla-col-azioni">
                        <div class="controlla-tempo">${tempoTesto} ${tempoBadge}</div>
                        <div class="controlla-badges-row">
                            ${promoHtml}${bestHtml}
                            <button class="btn-azione btn-conferma" data-id="${r.id}" title="Prezzo ancora valido — aggiorna solo la data">✓</button>
                            <button class="btn-azione btn-aggiorna" data-id="${r.id}" title="Modifica dati">✎</button>
                        </div>
                    </td>
                </tr>
                <tr class="controlla-edit-row" id="edit-${r.id}" style="display:none">
                    <td colspan="4">
                        <div class="controlla-edit-box">
                            <div class="controlla-edit-fields">
                                <div class="field">
                                    <label>Prezzo (€)</label>
                                    <input type="number" class="edit-prezzo" value="${r.prezzo}" min="0" step="0.01" />
                                </div>
                                <div class="field">
                                    <label>Quantità</label>
                                    <input type="number" class="edit-quantita" value="${r.quantita}" min="0" step="any" />
                                </div>
                                <div class="field">
                                    <label>Unità</label>
                                    <select class="edit-unita">
                                        ${['g', 'kg', 'mg', 'ml', 'cl', 'dl', 'l', 'pz'].map(u =>
                `<option value="${u}" ${u === r.unita ? 'selected' : ''}>${u}</option>`
            ).join('')}
                                    </select>
                                </div>
                                <div class="field">
                                    <label>Variante</label>
                                    <input type="text" class="edit-variante" value="${r.variante || ''}" placeholder="nessuna" />
                                </div>
                                <div class="field">
                                    <label>Promo</label>
                                    <select class="edit-promo">
                                        <option value="false" ${!r.promozione ? 'selected' : ''}>No</option>
                                        <option value="true"  ${r.promozione ? 'selected' : ''}>Sì</option>
                                    </select>
                                </div>
                                <div class="field edit-field-note">
                                    <label>Note</label>
                                    <input type="text" class="edit-note" value="${r.note || ''}" placeholder="opzionale" />
                                </div>
                            </div>
                            <div class="controlla-edit-actions">
                                <button class="btn btn-primary btn-sm btn-salva-edit" data-id="${r.id}">Salva</button>
                                <button class="btn btn-ghost   btn-sm btn-annulla-edit" data-id="${r.id}">Annulla</button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        sezione.innerHTML = `
            ${titoloHtml}
            <div class="table-responsive">
                <table class="results-table controlla-table">
                    <thead>
                        <tr>
                            <th>Negozio</th>
                            <th>€ / ${unitaBase}</th>
                            <th>Formato</th>
                            <th>Rilevazione</th>
                        </tr>
                    </thead>
                    <tbody>${righeHtml}</tbody>
                </table>
            </div>
        `;

        wrap.appendChild(sezione);
    }

    // ---- Listener pulsanti ----
    wrap.addEventListener('click', async (e) => {

        // Vai ad Analizza negozio
        if (e.target.closest('.controlla-btn-analizza')) {
            const btn = e.target.closest('.controlla-btn-analizza');
            navigate('analizza', { negozio: { id: parseInt(btn.dataset.negozioId), nome: btn.dataset.negozioNome, filiale: null } });
            return;
        }

        // CONFERMA
        if (e.target.classList.contains('btn-conferma')) {
            const id = e.target.dataset.id;
            const btn = e.target;
            btn.disabled = true;
            btn.textContent = '…';

            const { error } = await supabaseClient
                .from('prezzi')
                .update({ datarilevazione: new Date().toISOString().slice(0, 10) })
                .eq('id', id);

            if (error) {
                btn.textContent = '✗';
                btn.style.color = 'red';
            } else {
                btn.textContent = '✓';
                btn.style.background = '#e2efda';
                btn.style.color = '#276228';
                const td = btn.closest('tr').querySelector('.controlla-tempo');
                if (td) td.innerHTML = 'oggi';
            }
            btn.disabled = false;
        }

        // TOGGLE FORM AGGIORNA
        if (e.target.classList.contains('btn-aggiorna')) {
            const id = e.target.dataset.id;
            const editRow = document.getElementById(`edit-${id}`);
            const visibile = editRow.style.display !== 'none';
            editRow.style.display = visibile ? 'none' : 'table-row';
            e.target.textContent = visibile ? '✎' : '✕';
        }

        // ANNULLA
        if (e.target.classList.contains('btn-annulla-edit')) {
            const id = e.target.dataset.id;
            document.getElementById(`edit-${id}`).style.display = 'none';
            const btnAgg = wrap.querySelector(`.btn-aggiorna[data-id="${id}"]`);
            if (btnAgg) btnAgg.textContent = '✎';
        }

        // SALVA
        if (e.target.classList.contains('btn-salva-edit')) {
            const id = e.target.dataset.id;
            const editRow = document.getElementById(`edit-${id}`);
            const prezzo = parseFloat(editRow.querySelector('.edit-prezzo').value);
            const quantita = parseFloat(editRow.querySelector('.edit-quantita').value);
            const unita = editRow.querySelector('.edit-unita').value;
            const variante = editRow.querySelector('.edit-variante').value.trim().toLowerCase() || null;
            const promo = editRow.querySelector('.edit-promo').value === 'true';
            const note = editRow.querySelector('.edit-note').value.trim() || null;

            if (isNaN(prezzo) || isNaN(quantita) || !unita) {
                alert('Compila prezzo, quantità e unità.');
                return;
            }

            const prezzounita = calcolaPrezzoPer(prezzo, quantita, unita);
            const btn = e.target;
            btn.disabled = true;
            btn.textContent = '…';

            const { error } = await supabaseClient
                .from('prezzi')
                .update({
                    prezzo, quantita, unita, prezzounita,
                    variante, promozione: promo, note,
                    datarilevazione: new Date().toISOString().slice(0, 10)
                })
                .eq('id', id);

            if (error) {
                btn.disabled = false;
                btn.textContent = 'Salva';
                alert('Errore nel salvataggio. Riprova.');
            } else {
                cercaRilevazioni(prodotto);
            }
        }
    });
}

function calcolaEtaTesto(dataStr) {
    const oggi = new Date();
    const data = new Date(dataStr);
    const giorni = Math.floor((oggi - data) / (1000 * 60 * 60 * 24));
    const mesi = Math.floor(giorni / 30);
    const anni = Math.floor(giorni / 365);

    let testo;
    if (giorni === 0) testo = 'oggi';
    else if (giorni === 1) testo = 'ieri';
    else if (giorni < 30) testo = `${giorni} giorni fa`;
    else if (mesi < 12) testo = `${mesi} ${mesi === 1 ? 'mese' : 'mesi'} fa`;
    else testo = `${anni} ${anni === 1 ? 'anno' : 'anni'} fa`;

    let badge = '';
    if (giorni >= 365) badge = `<span class="badge badge-vecchio">non attendibile</span>`;
    else if (giorni >= 180) badge = `<span class="badge badge-inattendibile">da verificare</span>`;

    return { testo, badge };
}