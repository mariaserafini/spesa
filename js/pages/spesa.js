// ============================================================
// SPESA.JS — lista della spesa con suggerimenti negozio
// ============================================================

async function renderSpesa() {
    document.getElementById('app').innerHTML = `
        <div class="page-header">
            <h1>Lista della spesa</h1>
        </div>

        <!-- AGGIUNGI PRODOTTO -->
        <div class="card">
            <div class="field" style="margin:0">
                <label for="inputSpesaProdotto">Aggiungi prodotto</label>
                <div class="spesa-input-row">
                    <div class="ac-wrapper" style="flex:1">
                        <input type="text" id="inputSpesaProdotto"
                               placeholder="es. noci, ceci, tahina…"
                               autocomplete="off" />
                        <div class="ac-dropdown" id="dropdownSpesa"></div>
                    </div>
                    <button class="btn btn-primary" id="btnAggiungiSpesa">Aggiungi</button>
                </div>
            </div>
        </div>

        <!-- LISTA + RISULTATI -->
        <div id="spesaWrap"></div>
    `;

    await initSpesa();
}

async function initSpesa() {
    const seimesifa = new Date();
    seimesifa.setMonth(seimesifa.getMonth() - 6);
    const soglia = seimesifa.toISOString().slice(0, 10);

    // Carica prodotti per autocomplete
    const { data: prodotti } = await supabaseClient
        .from('prodotti')
        .select('id, nome, unita, categoria')
        .order('nome');

    // Carica lista spesa salvata
    const { data: listaDB } = await supabaseClient
        .from('lista_spesa')
        .select('id, fkprodotto, variante, prodotti(id, nome, unita)')
        .order('datacreazione');

    // Carica prezzi recenti per suggerimenti
    const { data: prezziRecenti } = await supabaseClient
        .from('prezzi')
        .select('id, fkprodotto, variante, prezzo, quantita, unita, prezzounita, negozi(id, nome, filiale)')
        .gte('datarilevazione', soglia);

    let lista = (listaDB || []).map(r => ({
        listaId: r.id,
        prodottoId: r.fkprodotto,
        variante: r.variante,
        nome: r.prodotti.nome,
        unita: r.prodotti.unita,
    }));

    // Mappa prezzi: fkprodotto → [ { ... } ] ordinati per prezzo
    const prezziPerProdotto = {};
    for (const r of (prezziRecenti || [])) {
        const id = r.fkprodotto;
        if (!prezziPerProdotto[id]) prezziPerProdotto[id] = [];
        prezziPerProdotto[id].push({
            prezzoId: r.id,
            variante: r.variante,
            prezzo: r.prezzo,
            quantita: r.quantita,
            unita: r.unita,
            prezzounita: r.prezzounita,
            negozioId: r.negozi.id,
            negozioNome: r.negozi.filiale ? `${r.negozi.nome} (${r.negozi.filiale})` : r.negozi.nome,
        });
    }
    for (const id in prezziPerProdotto) {
        prezziPerProdotto[id].sort((a, b) => a.prezzounita - b.prezzounita);
    }

    let prodottoScelto = null;
    let vistaCorrente = 'negozio'; // 'negozio' | 'prodotto'

    creaAutocomplete({
        input: document.getElementById('inputSpesaProdotto'),
        dropdown: document.getElementById('dropdownSpesa'),
        lista: prodotti,
        mostraNuovo: true,
        onSelect: (p) => { prodottoScelto = p; },
        onNuovo: async (testo) => {
            const nome = normalizzaProdotto(testo);
            if (!nome) return;
            const { data, error } = await supabaseClient
                .from('prodotti')
                .insert({ nome, categoria: 'Altro', unita: 'kg' })
                .select('id, nome, unita, categoria')
                .single();
            if (error) { alert('Errore nella creazione del prodotto.'); return; }
            prodotti.push(data);
            prodottoScelto = data;
            document.getElementById('inputSpesaProdotto').value = data.nome;
            document.getElementById('btnAggiungiSpesa').click();
        }
    });

    document.getElementById('inputSpesaProdotto').addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const testo = normalizzaProdotto(e.target.value);
        if (!testo) return;
        const match = prodotti.find(p => p.nome.toLowerCase().includes(testo));
        if (match) {
            e.target.value = match.nome;
            document.getElementById('dropdownSpesa').style.display = 'none';
            prodottoScelto = match;
        }
        document.getElementById('btnAggiungiSpesa').click();
    });

    document.getElementById('btnAggiungiSpesa').addEventListener('click', async () => {
        if (!prodottoScelto) return;

        // Trova tutte le varianti esistenti per questo prodotto (dai prezzi recenti)
        const variantiEsistenti = (prezziPerProdotto[prodottoScelto.id] || [])
            .map(p => p.variante)
            .filter((v, i, arr) => arr.indexOf(v) === i); // dedup

        // Righe da inserire: una per variante, o una sola senza variante
        const righeNuove = variantiEsistenti.length > 0
            ? variantiEsistenti
            : [null];

        // Filtra varianti già in lista
        const righeFiltered = righeNuove.filter(v =>
            !lista.find(i => i.prodottoId === prodottoScelto.id && i.variante === v)
        );

        if (righeFiltered.length === 0) {
            document.getElementById('inputSpesaProdotto').value = '';
            prodottoScelto = null;
            return;
        }

        const inserts = righeFiltered.map(v => ({
            fkprodotto: prodottoScelto.id,
            variante: v
        }));

        const { data, error } = await supabaseClient
            .from('lista_spesa')
            .insert(inserts)
            .select('id, fkprodotto, variante, prodotti(id, nome, unita)');

        if (!error && data) {
            for (const r of data) {
                lista.push({ listaId: r.id, prodottoId: r.fkprodotto, variante: r.variante, nome: r.prodotti.nome, unita: r.prodotti.unita });
            }
            lista.sort((a, b) => a.nome.localeCompare(b.nome) || (a.variante || '').localeCompare(b.variante || ''));
        }
        document.getElementById('inputSpesaProdotto').value = '';
        prodottoScelto = null;
        renderLista();
    });

    function renderLista() {
        const wrap = document.getElementById('spesaWrap');
        if (lista.length === 0) {
            wrap.innerHTML = `<p class="text-muted" style="margin-top:1rem">Lista vuota — aggiungi qualche prodotto.</p>`;
            return;
        }

        wrap.innerHTML = `
            <div class="spesa-toolbar">
                <span class="text-muted" style="font-size:.85rem">${lista.length} prodott${lista.length === 1 ? 'o' : 'i'}</span>
                <div class="spesa-vista-toggle">
                    <button class="btn-vista ${vistaCorrente === 'negozio' ? 'attiva' : ''}" data-vista="negozio">Per negozio</button>
                    <button class="btn-vista ${vistaCorrente === 'prodotto' ? 'attiva' : ''}" data-vista="prodotto">Per prodotto</button>
                </div>
                <button class="btn btn-ghost btn-sm" id="btnSvuotaSpesa">Svuota lista</button>
            </div>
            <div id="spesaContenuto"></div>
        `;

        wrap.querySelector('.spesa-vista-toggle').addEventListener('click', e => {
            const btn = e.target.closest('.btn-vista');
            if (!btn) return;
            vistaCorrente = btn.dataset.vista;
            renderLista();
        });

        wrap.querySelector('#btnSvuotaSpesa').addEventListener('click', async () => {
            if (!confirm('Svuotare tutta la lista?')) return;
            await supabaseClient.from('lista_spesa').delete().neq('id', 0);
            lista = [];
            renderLista();
        });

        const contenuto = document.getElementById('spesaContenuto');

        if (vistaCorrente === 'prodotto') renderVistaProdotto(contenuto);
        else renderVistaNegozio(contenuto);
    }

    // ---- Vista per prodotto ----
    function renderVistaProdotto(contenuto) {
        const unitaBase = lista[0]?.unita || 'kg';

        const righeHtml = [...lista].sort((a, b) => a.nome.localeCompare(b.nome) || (a.variante || '').localeCompare(b.variante || '')).map(item => {
            const tuttiPrezzi = prezziPerProdotto[item.prodottoId] || [];
            const prezzi = item.variante
                ? tuttiPrezzi.filter(p => p.variante === item.variante)
                : tuttiPrezzi;
            const migliore = prezzi[0];
            const altri = prezzi.slice(1).filter(p =>
                (p.prezzounita - migliore.prezzounita) / migliore.prezzounita <= 0.10
            );

            const varLabel = item.variante ? `<div class="controlla-note">${item.variante}</div>` : '';
            const prezzoId = migliore ? migliore.prezzoId : null;

            // Colonna negozio/prezzo: migliore + alternative
            let negozioColHtml = '';
            if (!migliore) {
                negozioColHtml = `<span class="text-muted" style="font-size:.82rem">Nessun prezzo recente</span>`;
            } else {
                negozioColHtml = `<button class="btn-nome spesa-btn-analizza" data-negozio-id="${migliore.negozioId}" data-negozio-nome="${migliore.negozioNome}" style="font-weight:600;color:var(--accent)">${migliore.negozioNome}</button>`;
                if (altri.length > 0) {
                    negozioColHtml += altri.map(a => {
                        const pct = Math.round((a.prezzounita - migliore.prezzounita) / migliore.prezzounita * 100);
                        return `<div class="controlla-note"><button class="btn-nome spesa-btn-analizza" data-negozio-id="${a.negozioId}" data-negozio-nome="${a.negozioNome}">${a.negozioNome}</button> <span class="controlla-scarto">+${pct}%</span></div>`;
                    }).join('');
                }
            }

            const prezzoUnitaHtml = migliore
                ? `€ ${parseFloat(migliore.prezzounita).toFixed(2)}`
                : '';
            const formatoHtml = migliore
                ? `${migliore.quantita}${migliore.unita}<br>(€ ${parseFloat(migliore.prezzo).toFixed(2)})`
                : '';
            const formatoMobile = migliore?.quantita ? `<span class="controlla-formato-mobile">${migliore.quantita}${migliore.unita}</span>` : '';

            const azioniHtml = `
                <div class="controlla-badges-row">
                    ${prezzoId ? `
                        <button class="btn-azione btn-conferma spesa-btn-conferma" data-id="${prezzoId}" title="Prezzo ancora valido">✓</button>
                        <button class="btn-azione btn-aggiorna spesa-btn-aggiorna" data-id="${prezzoId}" data-lista-id="${item.listaId}" title="Modifica">✎</button>
                    ` : `
                        <button class="btn-azione btn-aggiorna spesa-btn-aggiorna" data-id="" data-lista-id="${item.listaId}" data-prodotto-id="${item.prodottoId}" data-variante="${item.variante || ''}" title="Aggiungi rilevazione">✎</button>
                    `}
                    <button class="btn-rimuovi-spesa" data-id="${item.listaId}" title="Rimuovi dalla lista">✕</button>
                </div>`;

            const editId = `spesa-edit-${item.listaId}`;
            const editHtml = `
                <tr class="controlla-edit-row" id="${editId}" style="display:none">
                    <td colspan="4">
                        <div class="controlla-edit-box">
                            <div class="controlla-edit-fields">
                                <div class="field">
                                    <label>Prezzo (€)</label>
                                    <input type="number" class="edit-prezzo" value="${migliore ? migliore.prezzo || '' : ''}" min="0" step="0.01" />
                                </div>
                                <div class="field">
                                    <label>Quantità</label>
                                    <input type="number" class="edit-quantita" value="${migliore ? migliore.quantita || '' : ''}" min="0" step="any" />
                                </div>
                                <div class="field">
                                    <label>Unità</label>
                                    <select class="edit-unita">
                                        ${['g', 'kg', 'mg', 'ml', 'cl', 'dl', 'l', 'pz'].map(u =>
                `<option value="${u}" ${u === (migliore ? migliore.unita : item.unita) ? 'selected' : ''
                }>${u}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="field">
                                    <label>Negozio</label>
                                    <div class="ac-wrapper">
                                        <input type="text" class="edit-negozio-input" placeholder="es. Lidl" autocomplete="off" value="${migliore ? migliore.negozioNome : ''}" />
                                        <div class="ac-dropdown edit-negozio-dropdown"></div>
                                    </div>
                                </div>
                                <div class="field">
                                    <label>Promo</label>
                                    <select class="edit-promo">
                                        <option value="false">No</option>
                                        <option value="true">Sì</option>
                                    </select>
                                </div>
                            </div>
                            <div class="controlla-edit-actions">
                                <button class="btn btn-primary btn-sm spesa-btn-salva" data-prezzo-id="${prezzoId || ''}" data-prodotto-id="${item.prodottoId}" data-variante="${item.variante || ''}" data-lista-id="${item.listaId}">Salva</button>
                                <button class="btn btn-ghost btn-sm spesa-btn-annulla" data-edit-id="${editId}">Annulla</button>
                            </div>
                        </div>
                    </td>
                </tr>`;

            return `
                <tr>
                    <td>
                        <button class="btn-nome spesa-btn-controlla controlla-negozio" data-prodotto-nome="${item.nome}">${item.nome}</button>
                        ${varLabel}
                    </td>
                    <td class="controlla-prezzo-unita">
                        <div class="prezzo-col">${prezzoUnitaHtml}${formatoMobile}</div>
                        <div class="spesa-negozio-sotto">${negozioColHtml}</div>
                    </td>
                    <td class="controlla-prezzo-formato">${formatoHtml}</td>
                    <td class="controlla-col-azioni">${azioniHtml}</td>
                </tr>
                ${editHtml}`;
        }).join('');

        contenuto.innerHTML = `
            <div class="card" style="padding:0; overflow:hidden">
                <div class="table-responsive">
                    <table class="results-table controlla-table">
                        <thead><tr>
                            <th>Prodotto</th>
                            <th>€ / ${unitaBase}</th>
                            <th>Formato</th>
                            <th>Negozio migliore</th>
                        </tr></thead>
                        <tbody>${righeHtml}</tbody>
                    </table>
                </div>
            </div>`;

        // ---- Listener ----
        contenuto.addEventListener('click', async e => {
            // Rimuovi
            if (e.target.closest('.btn-rimuovi-spesa')) {
                rimuovi(parseInt(e.target.closest('.btn-rimuovi-spesa').dataset.id));
                return;
            }

            // Vai a Controlla
            if (e.target.closest('.spesa-btn-controlla')) {
                const nome = e.target.closest('.spesa-btn-controlla').dataset.prodottoNome;
                await navigate('controlla');
                const input = document.getElementById('inputCercaProdotto');
                if (input) {
                    input.value = nome;
                    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                }
                return;
            }

            // Vai ad Analizza negozio
            if (e.target.closest('.spesa-btn-analizza')) {
                const btn = e.target.closest('.spesa-btn-analizza');
                navigate('analizza', { negozio: { id: parseInt(btn.dataset.negozioId), nome: btn.dataset.negozioNome, filiale: null } });
                return;
            }

            // CONFERMA
            if (e.target.closest('.spesa-btn-conferma')) {
                const btn = e.target.closest('.spesa-btn-conferma');
                const id = btn.dataset.id;
                btn.disabled = true; btn.textContent = '…';
                const { error } = await supabaseClient
                    .from('prezzi')
                    .update({ datarilevazione: new Date().toISOString().slice(0, 10) })
                    .eq('id', id);
                btn.disabled = false;
                btn.textContent = error ? '✗' : '✓';
                if (!error) { btn.style.background = '#e2efda'; btn.style.color = '#276228'; }
                return;
            }

            // TOGGLE FORM
            if (e.target.closest('.spesa-btn-aggiorna')) {
                const btn = e.target.closest('.spesa-btn-aggiorna');
                const editId = `spesa-edit-${btn.dataset.listaId}`;
                const editBox = document.getElementById(editId);
                const aperto = editBox.style.display !== 'none';
                editBox.style.display = aperto ? 'none' : 'block';
                btn.textContent = aperto ? '✎' : '✕';

                // Inizializza autocomplete negozio al primo apertura
                if (!aperto && !editBox.dataset.acInit) {
                    editBox.dataset.acInit = '1';
                    const { data: negozi } = await supabaseClient.from('negozi').select('id, nome, filiale').order('nome');
                    creaAutocomplete({
                        input: editBox.querySelector('.edit-negozio-input'),
                        dropdown: editBox.querySelector('.edit-negozio-dropdown'),
                        lista: negozi,
                        mostraNuovo: false,
                        onSelect: (n) => { editBox.dataset.negozioId = n.id; editBox.querySelector('.edit-negozio-input').value = n.nome; },
                        onNuovo: () => { }
                    });
                }
                return;
            }

            // ANNULLA
            if (e.target.closest('.spesa-btn-annulla')) {
                const editId = e.target.closest('.spesa-btn-annulla').dataset.editId;
                document.getElementById(editId).style.display = 'none';
                const listaId = editId.replace('spesa-edit-', '');
                const btnAgg = contenuto.querySelector(`.spesa-btn-aggiorna[data-lista-id="${listaId}"]`);
                if (btnAgg) btnAgg.textContent = '✎';
                return;
            }

            // SALVA
            if (e.target.closest('.spesa-btn-salva')) {
                const btn = e.target.closest('.spesa-btn-salva');
                const editId = `spesa-edit-${btn.dataset.listaId}`;
                const editBox = document.getElementById(editId);
                const prezzoId = btn.dataset.prezzoId;
                const prodottoId = parseInt(btn.dataset.prodottoId);
                const variante = btn.dataset.variante || null;

                const prezzo = parseFloat(editBox.querySelector('.edit-prezzo').value);
                const quantita = parseFloat(editBox.querySelector('.edit-quantita').value);
                const unita = editBox.querySelector('.edit-unita').value;
                const negozioId = parseInt(editBox.dataset.negozioId);
                const promo = editBox.querySelector('.edit-promo').value === 'true';

                if (isNaN(prezzo) || isNaN(quantita) || !unita || isNaN(negozioId)) {
                    alert('Compila tutti i campi, incluso il negozio.'); return;
                }

                const prezzounita = calcolaPrezzoPer(prezzo, quantita, unita);
                btn.disabled = true; btn.textContent = '…';

                let error;
                if (prezzoId) {
                    // Aggiorna esistente
                    ({ error } = await supabaseClient.from('prezzi')
                        .update({
                            prezzo, quantita, unita, prezzounita, promozione: promo,
                            datarilevazione: new Date().toISOString().slice(0, 10)
                        })
                        .eq('id', prezzoId));
                } else {
                    // Inserisce nuovo
                    ({ error } = await supabaseClient.from('prezzi')
                        .insert({
                            fkprodotto: prodottoId, fknegozio: negozioId, variante,
                            prezzo, quantita, unita, prezzounita, promozione: promo,
                            datarilevazione: new Date().toISOString().slice(0, 10)
                        }));
                }

                if (error) {
                    btn.disabled = false; btn.textContent = 'Salva';
                    alert('Errore nel salvataggio.'); return;
                }
                // Ricarica la pagina spesa per aggiornare i prezzi
                renderSpesa();
            }
        });
    }

    // ---- Vista per negozio ----
    function renderVistaNegozio(contenuto) {
        const perNegozio = {};

        for (const item of lista) {
            const tuttiPrezzi = prezziPerProdotto[item.prodottoId] || [];
            const prezzi = item.variante
                ? tuttiPrezzi.filter(p => p.variante === item.variante)
                : tuttiPrezzi;
            if (prezzi.length === 0) {
                if (!perNegozio['__nessuno__']) perNegozio['__nessuno__'] = [];
                perNegozio['__nessuno__'].push({ item, migliore: null });
                continue;
            }
            const migliore = prezzi[0];
            const key = migliore.negozioNome;
            if (!perNegozio[key]) { perNegozio[key] = []; perNegozio[key]._negozioId = migliore.negozioId; }
            perNegozio[key].push({ item, migliore });
        }

        const negoziOrdinati = Object.keys(perNegozio)
            .filter(k => k !== '__nessuno__')
            .sort();
        if (perNegozio['__nessuno__']) negoziOrdinati.push('__nessuno__');

        const html = negoziOrdinati.map(negNome => {
            const prodotti = perNegozio[negNome].sort((a, b) => a.item.nome.localeCompare(b.item.nome));
            const negozioId = perNegozio[negNome]._negozioId || null;
            const titoloInner = negNome === '__nessuno__' ? '⚠️ Senza prezzo recente'
                : `🏪 <button class="btn-link spesa-btn-analizza" data-negozio-id="${negozioId}" data-negozio-nome="${negNome}" style="font-weight:700;font-size:inherit">${negNome}</button>`;
            const titolo = titoloInner;

            const unitaBase = prodotti[0]?.item.unita || 'kg';

            const righe = prodotti.map(({ item, migliore }) => {
                const varLabel = item.variante ? `<div class="controlla-note">${item.variante}</div>` : '';
                const prezzoId = migliore ? migliore.prezzoId : null;
                const editId = `spesa-edit-neg-${item.listaId}`;

                const prezzoUnitaHtml = migliore
                    ? `€ ${parseFloat(migliore.prezzounita).toFixed(2)}`
                    : `<span class="text-muted" style="font-size:.8rem">—</span>`;
                const formatoHtml = migliore
                    ? `${migliore.quantita}${migliore.unita}<br>(€ ${parseFloat(migliore.prezzo).toFixed(2)})`
                    : '';
                const formatoMobile = migliore?.quantita ? `<span class="controlla-formato-mobile">${migliore.quantita}${migliore.unita}</span>` : '';

                const azioniHtml = `
                    <div class="controlla-badges-row">
                        ${prezzoId ? `
                            <button class="btn-azione btn-conferma spesa-btn-conferma" data-id="${prezzoId}" title="Prezzo ancora valido">✓</button>
                            <button class="btn-azione btn-aggiorna spesa-btn-aggiorna" data-id="${prezzoId}" data-lista-id="${item.listaId}" data-edit-suffix="neg-" title="Modifica">✎</button>
                        ` : `
                            <button class="btn-azione btn-aggiorna spesa-btn-aggiorna" data-id="" data-lista-id="${item.listaId}" data-edit-suffix="neg-" data-prodotto-id="${item.prodottoId}" data-variante="${item.variante || ''}" title="Aggiungi rilevazione">✎</button>
                        `}
                        <button class="btn-rimuovi-spesa" data-id="${item.listaId}" title="Rimuovi">✕</button>
                    </div>`;

                const editHtml = `
                    <tr class="controlla-edit-row" id="${editId}" style="display:none">
                        <td colspan="4">
                            <div class="controlla-edit-box">
                                <div class="controlla-edit-fields">
                                    <div class="field">
                                        <label>Prezzo (€)</label>
                                        <input type="number" class="edit-prezzo" value="${migliore ? migliore.prezzo || '' : ''}" min="0" step="0.01" />
                                    </div>
                                    <div class="field">
                                        <label>Quantità</label>
                                        <input type="number" class="edit-quantita" value="${migliore ? migliore.quantita || '' : ''}" min="0" step="any" />
                                    </div>
                                    <div class="field">
                                        <label>Unità</label>
                                        <select class="edit-unita">
                                            ${['g', 'kg', 'mg', 'ml', 'cl', 'dl', 'l', 'pz'].map(u =>
                    `<option value="${u}" ${u === (migliore ? migliore.unita : item.unita) ? 'selected' : ''
                    }>${u}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="field">
                                        <label>Negozio</label>
                                        <div class="ac-wrapper">
                                            <input type="text" class="edit-negozio-input" placeholder="es. Lidl" autocomplete="off" value="${migliore ? migliore.negozioNome : ''}" />
                                            <div class="ac-dropdown edit-negozio-dropdown"></div>
                                        </div>
                                    </div>
                                    <div class="field">
                                        <label>Promo</label>
                                        <select class="edit-promo">
                                            <option value="false">No</option>
                                            <option value="true">Sì</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="controlla-edit-actions">
                                    <button class="btn btn-primary btn-sm spesa-btn-salva" data-prezzo-id="${prezzoId || ''}" data-prodotto-id="${item.prodottoId}" data-variante="${item.variante || ''}" data-lista-id="${item.listaId}">Salva</button>
                                    <button class="btn btn-ghost btn-sm spesa-btn-annulla" data-edit-id="${editId}">Annulla</button>
                                </div>
                            </div>
                        </td>
                    </tr>`;

                return `
                    <tr>
                        <td>
                            <button class="btn-nome spesa-btn-controlla controlla-negozio" data-prodotto-nome="${item.nome}">${item.nome}</button>
                            ${varLabel}
                        </td>
                        <td class="controlla-prezzo-unita"><div class="prezzo-col">${prezzoUnitaHtml}${formatoMobile}</div></td>
                        <td class="controlla-prezzo-formato">${formatoHtml}</td>
                        <td class="controlla-col-azioni">${azioniHtml}</td>
                    </tr>
                    ${editHtml}`;
            }).join('');

            return `
                <div class="card spesa-negozio-box">
                    <div class="spesa-negozio-titolo">${titolo}
                        <span class="analizza-box-count">${prodotti.length}</span>
                    </div>
                    <div class="table-responsive">
                        <table class="results-table controlla-table">
                            <thead><tr>
                                <th>Prodotto</th>
                                <th>€ / ${unitaBase}</th>
                                <th>Formato</th>
                                <th></th>
                            </tr></thead>
                            <tbody>${righe}</tbody>
                        </table>
                    </div>
                </div>`;
        }).join('');

        contenuto.innerHTML = html;

        // Listener — identici alla vista prodotto, gestisce anche edit-suffix "neg-"
        contenuto.addEventListener('click', async e => {
            if (e.target.closest('.btn-rimuovi-spesa')) {
                rimuovi(parseInt(e.target.closest('.btn-rimuovi-spesa').dataset.id));
                return;
            }
            if (e.target.closest('.spesa-btn-controlla')) {
                const nome = e.target.closest('.spesa-btn-controlla').dataset.prodottoNome;
                await navigate('controlla');
                const input = document.getElementById('inputCercaProdotto');
                if (input) { input.value = nome; input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }
                return;
            }

            // Vai ad Analizza negozio
            if (e.target.closest('.spesa-btn-analizza')) {
                const btn = e.target.closest('.spesa-btn-analizza');
                navigate('analizza', { negozio: { id: parseInt(btn.dataset.negozioId), nome: btn.dataset.negozioNome, filiale: null } });
                return;
            }

            if (e.target.closest('.spesa-btn-conferma')) {
                const btn = e.target.closest('.spesa-btn-conferma');
                btn.disabled = true; btn.textContent = '…';
                const { error } = await supabaseClient.from('prezzi')
                    .update({ datarilevazione: new Date().toISOString().slice(0, 10) })
                    .eq('id', btn.dataset.id);
                btn.disabled = false;
                btn.textContent = error ? '✗' : '✓';
                if (!error) { btn.style.background = '#e2efda'; btn.style.color = '#276228'; }
                return;
            }
            if (e.target.closest('.spesa-btn-aggiorna')) {
                const btn = e.target.closest('.spesa-btn-aggiorna');
                const suffix = btn.dataset.editSuffix || '';
                const editId = `spesa-edit-${suffix}${btn.dataset.listaId}`;
                const editBox = document.getElementById(editId);
                const aperto = editBox.style.display !== 'none';
                const isTr = editBox.tagName === 'TR';
                editBox.style.display = aperto ? 'none' : (isTr ? 'table-row' : 'block');
                btn.textContent = aperto ? '✎' : '✕';
                if (!aperto && !editBox.dataset.acInit) {
                    editBox.dataset.acInit = '1';
                    const { data: negozi } = await supabaseClient.from('negozi').select('id, nome, filiale').order('nome');
                    creaAutocomplete({
                        input: editBox.querySelector('.edit-negozio-input'),
                        dropdown: editBox.querySelector('.edit-negozio-dropdown'),
                        lista: negozi, mostraNuovo: false,
                        onSelect: (n) => { editBox.dataset.negozioId = n.id; editBox.querySelector('.edit-negozio-input').value = n.nome; },
                        onNuovo: () => { }
                    });
                }
                return;
            }
            if (e.target.closest('.spesa-btn-annulla')) {
                const editId = e.target.closest('.spesa-btn-annulla').dataset.editId;
                document.getElementById(editId).style.display = 'none';
                const listaId = editId.replace('spesa-edit-neg-', '').replace('spesa-edit-', '');
                const btnAgg = contenuto.querySelector(`.spesa-btn-aggiorna[data-lista-id="${listaId}"]`);
                if (btnAgg) btnAgg.textContent = '✎';
                return;
            }
            if (e.target.closest('.spesa-btn-salva')) {
                const btn = e.target.closest('.spesa-btn-salva');
                const listaId = btn.dataset.listaId;
                const editBox = contenuto.querySelector(`[id^="spesa-edit-"][id$="${listaId}"]`);
                const prezzoId = btn.dataset.prezzoId;
                const prodottoId = parseInt(btn.dataset.prodottoId);
                const variante = btn.dataset.variante || null;
                const prezzo = parseFloat(editBox.querySelector('.edit-prezzo').value);
                const quantita = parseFloat(editBox.querySelector('.edit-quantita').value);
                const unita = editBox.querySelector('.edit-unita').value;
                const negozioId = parseInt(editBox.dataset.negozioId);
                const promo = editBox.querySelector('.edit-promo').value === 'true';
                if (isNaN(prezzo) || isNaN(quantita) || !unita || isNaN(negozioId)) {
                    alert('Compila tutti i campi, incluso il negozio.'); return;
                }
                const prezzounita = calcolaPrezzoPer(prezzo, quantita, unita);
                btn.disabled = true; btn.textContent = '…';
                let error;
                if (prezzoId) {
                    ({ error } = await supabaseClient.from('prezzi')
                        .update({
                            prezzo, quantita, unita, prezzounita, promozione: promo,
                            datarilevazione: new Date().toISOString().slice(0, 10)
                        })
                        .eq('id', prezzoId));
                } else {
                    ({ error } = await supabaseClient.from('prezzi')
                        .insert({
                            fkprodotto: prodottoId, fknegozio: negozioId, variante,
                            prezzo, quantita, unita, prezzounita, promozione: promo,
                            datarilevazione: new Date().toISOString().slice(0, 10)
                        }));
                }
                if (error) { btn.disabled = false; btn.textContent = 'Salva'; alert('Errore nel salvataggio.'); return; }
                renderSpesa();
            }
        });
    }

    async function rimuovi(listaId) {
        await supabaseClient.from('lista_spesa').delete().eq('id', listaId);
        lista = lista.filter(i => i.listaId !== listaId);
        renderLista();
    }

    renderLista();
}