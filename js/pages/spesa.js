// ============================================================
// SPESA.JS — lista della spesa con suggerimenti negozio
// ============================================================

async function renderSpesa() {
    document.getElementById('app').innerHTML = `
        <div class="page-header">
            <h1>Lista della spesa</h1>
        </div>
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
        <div id="spesaWrap"></div>
    `;
    await initSpesa();
}

async function initSpesa() {
    const seimesifa = new Date();
    seimesifa.setMonth(seimesifa.getMonth() - 6);
    const soglia = seimesifa.toISOString().slice(0, 10);

    const { data: prodotti } = await supabaseClient
        .from('prodotti').select('id, nome, unita, categoria').order('nome');

    const { data: listaDB } = await supabaseClient
        .from('lista_spesa')
        .select('id, fkprodotto, variante, prodotti(id, nome, unita)')
        .order('datacreazione');

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

    const prezziPerProdotto = {};
    for (const r of (prezziRecenti || [])) {
        if (!prezziPerProdotto[r.fkprodotto]) prezziPerProdotto[r.fkprodotto] = [];
        prezziPerProdotto[r.fkprodotto].push({
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
    for (const id in prezziPerProdotto)
        prezziPerProdotto[id].sort((a, b) => a.prezzounita - b.prezzounita);

    let prodottoScelto = null;
    let vistaCorrente = 'negozio';

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
                .select('id, nome, unita, categoria').single();
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
        const variantiEsistenti = (prezziPerProdotto[prodottoScelto.id] || [])
            .map(p => p.variante).filter((v, i, arr) => arr.indexOf(v) === i);
        const righeNuove = variantiEsistenti.length > 0 ? variantiEsistenti : [null];
        const righeFiltered = righeNuove.filter(v =>
            !lista.find(i => i.prodottoId === prodottoScelto.id && i.variante === v));
        if (righeFiltered.length === 0) {
            document.getElementById('inputSpesaProdotto').value = '';
            prodottoScelto = null;
            return;
        }
        const { data, error } = await supabaseClient
            .from('lista_spesa')
            .insert(righeFiltered.map(v => ({ fkprodotto: prodottoScelto.id, variante: v })))
            .select('id, fkprodotto, variante, prodotti(id, nome, unita)');
        if (!error && data) {
            for (const r of data)
                lista.push({
                    listaId: r.id, prodottoId: r.fkprodotto, variante: r.variante,
                    nome: r.prodotti.nome, unita: r.prodotti.unita
                });
            lista.sort((a, b) => a.nome.localeCompare(b.nome) || (a.variante || '').localeCompare(b.variante || ''));
        }
        document.getElementById('inputSpesaProdotto').value = '';
        prodottoScelto = null;
        renderLista();
    });

    // ---- renderLista ----
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
            <div id="spesaContenuto"></div>`;
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

    // ================================================================
    // VISTA PER PRODOTTO — lista alfabetica, 2 negozi migliori
    // ================================================================
    function renderVistaProdotto(contenuto) {
        const righeHtml = [...lista]
            .sort((a, b) => a.nome.localeCompare(b.nome) || (a.variante || '').localeCompare(b.variante || ''))
            .map(item => {
                const tuttiPrezzi = (prezziPerProdotto[item.prodottoId] || [])
                    .filter(p => item.variante ? p.variante === item.variante : true);
                const n1 = tuttiPrezzi[0] || null;
                const n2 = tuttiPrezzi[1] || null;
                const prezzoId = n1?.prezzoId || null;
                const varHtml = item.variante ? `<div class="controlla-note">${item.variante}</div>` : '';

                const neg1Html = n1
                    ? `<div><button class="btn-nome spesa-btn-analizza" data-negozio-id="${n1.negozioId}" data-negozio-nome="${n1.negozioNome}" style="color:var(--accent);font-weight:600">${n1.negozioNome}</button></div>
                       <div class="controlla-prezzo-unita" style="font-size:.88rem">€ ${parseFloat(n1.prezzounita).toFixed(2)}/${item.unita}</div>
                       <div class="controlla-prezzo-formato">${n1.quantita}${n1.unita} (€ ${parseFloat(n1.prezzo).toFixed(2)})</div>`
                    : `<span class="text-muted">Nessun prezzo recente</span>`;

                const pct2 = n2 && n1 ? Math.round((n2.prezzounita - n1.prezzounita) / n1.prezzounita * 100) : 0;
                const neg2Html = n2
                    ? `<div><button class="btn-nome spesa-btn-analizza" data-negozio-id="${n2.negozioId}" data-negozio-nome="${n2.negozioNome}">${n2.negozioNome}</button> <span class="controlla-scarto">+${pct2}%</span></div>
                       <div class="controlla-prezzo-formato">${n2.quantita}${n2.unita} (€ ${parseFloat(n2.prezzo).toFixed(2)})</div>`
                    : '';

                const azioniHtml = `<div class="controlla-badges-row">
                    ${prezzoId ? `<button class="btn-azione btn-conferma spesa-btn-conferma" data-id="${prezzoId}" title="Conferma">✓</button>` : ''}
                    <button class="btn-azione btn-aggiorna spesa-btn-aggiorna" data-id="${prezzoId || ''}" data-lista-id="${item.listaId}" title="Modifica">✎</button>
                    <button class="btn-rimuovi-spesa" data-id="${item.listaId}" title="Rimuovi">✕</button>
                </div>`;

                const editId = `spesa-edit-${item.listaId}`;
                return `
                    <tr>
                        <td><button class="btn-nome spesa-btn-controlla" data-prodotto-nome="${item.nome}">${item.nome}</button>${varHtml}</td>
                        <td>${neg1Html}</td>
                        <td>${neg2Html}</td>
                        <td class="controlla-col-azioni">${azioniHtml}</td>
                    </tr>
                    <tr class="controlla-edit-row" id="${editId}" style="display:none">
                        <td colspan="4"><div class="controlla-edit-box">${buildEditForm(editId, item, n1, prezzoId)}</div></td>
                    </tr>`;
            }).join('');

        contenuto.innerHTML = `
            <div class="card" style="padding:0;overflow:hidden;margin-top:1rem">
                <div class="table-responsive">
                    <table class="results-table controlla-table">
                        <thead><tr><th>Prodotto</th><th>1° negozio</th><th>2° negozio</th><th></th></tr></thead>
                        <tbody>${righeHtml}</tbody>
                    </table>
                </div>
            </div>`;
        aggiungiListener(contenuto);
    }

    // ================================================================
    // VISTA PER NEGOZIO — tabella per negozio migliore
    // ================================================================
    function renderVistaNegozio(contenuto) {
        const perNegozio = {};
        for (const item of lista) {
            const tuttiPrezzi = (prezziPerProdotto[item.prodottoId] || [])
                .filter(p => item.variante ? p.variante === item.variante : true);
            const migliore = tuttiPrezzi[0] || null;
            const key = migliore ? migliore.negozioNome : '__nessuno__';
            if (!perNegozio[key]) perNegozio[key] = { negozioId: migliore?.negozioId, items: [] };
            perNegozio[key].items.push({ item, prezzoRec: migliore });
        }
        const negoziOrdinati = Object.keys(perNegozio).filter(k => k !== '__nessuno__').sort();
        if (perNegozio['__nessuno__']) negoziOrdinati.push('__nessuno__');

        const html = negoziOrdinati.map(negNome => {
            const { negozioId, items } = perNegozio[negNome];
            const titolo = negNome === '__nessuno__'
                ? '⚠️ Senza prezzo recente'
                : `🏪 <button class="btn-nome spesa-btn-analizza" data-negozio-id="${negozioId}" data-negozio-nome="${negNome}" style="font-weight:700;font-size:inherit;color:var(--accent)">${negNome}</button>`;

            const righe = [...items].sort((a, b) => a.item.nome.localeCompare(b.item.nome)).map(({ item, prezzoRec }) => {
                const prezzoId = prezzoRec?.prezzoId || null;
                const varHtml = item.variante ? `<div class="controlla-note">${item.variante}</div>` : '';
                const puHtml = prezzoRec ? `€ ${parseFloat(prezzoRec.prezzounita).toFixed(2)}/${item.unita}` : '—';
                const fmtHtml = prezzoRec ? `${prezzoRec.quantita}${prezzoRec.unita}<br>(€ ${parseFloat(prezzoRec.prezzo).toFixed(2)})` : '';
                const azioniHtml = `<div class="controlla-badges-row">
                    ${prezzoId ? `<button class="btn-azione btn-conferma spesa-btn-conferma" data-id="${prezzoId}" title="Conferma">✓</button>` : ''}
                    <button class="btn-azione btn-aggiorna spesa-btn-aggiorna" data-id="${prezzoId || ''}" data-lista-id="${item.listaId}" title="Modifica">✎</button>
                    <button class="btn-rimuovi-spesa" data-id="${item.listaId}" title="Rimuovi">✕</button>
                </div>`;
                const editId = `spesa-edit-neg-${item.listaId}`;
                return `
                    <tr>
                        <td><button class="btn-nome spesa-btn-controlla" data-prodotto-nome="${item.nome}">${item.nome}</button>${varHtml}</td>
                        <td class="controlla-prezzo-unita">${puHtml}</td>
                        <td class="controlla-prezzo-formato">${fmtHtml}</td>
                        <td class="controlla-col-azioni">${azioniHtml}</td>
                    </tr>
                    <tr class="controlla-edit-row" id="${editId}" style="display:none">
                        <td colspan="4"><div class="controlla-edit-box">${buildEditForm(editId, item, prezzoRec, prezzoId)}</div></td>
                    </tr>`;
            }).join('');

            return `
                <div class="card spesa-negozio-box" style="padding:0;overflow:hidden;margin-top:1rem">
                    <div class="spesa-negozio-titolo">${titolo}
                        <span class="analizza-box-count">${items.length}</span>
                    </div>
                    <div class="table-responsive">
                        <table class="results-table controlla-table">
                            <thead><tr><th>Prodotto</th><th>€/unità</th><th>Formato</th><th></th></tr></thead>
                            <tbody>${righe}</tbody>
                        </table>
                    </div>
                </div>`;
        }).join('');

        contenuto.innerHTML = html;
        aggiungiListener(contenuto);
    }

    // ================================================================
    // FORM MODIFICA
    // ================================================================
    function buildEditForm(editId, item, prezzoRec, prezzoId) {
        const unita = prezzoRec?.unita || item.unita;
        return `
            <div class="controlla-edit-fields">
                <div class="field"><label>Prezzo (€)</label>
                    <input type="number" class="edit-prezzo" value="${prezzoRec?.prezzo || ''}" min="0" step="0.01" />
                </div>
                <div class="field"><label>Quantità</label>
                    <input type="number" class="edit-quantita" value="${prezzoRec?.quantita || ''}" min="0" step="any" />
                </div>
                <div class="field"><label>Unità</label>
                    <select class="edit-unita">
                        ${['g', 'kg', 'mg', 'ml', 'cl', 'dl', 'l', 'pz'].map(u =>
            `<option value="${u}" ${u === unita ? 'selected' : ''}>${u}</option>`).join('')}
                    </select>
                </div>
                <div class="field"><label>Negozio</label>
                    <div class="ac-wrapper">
                        <input type="text" class="edit-negozio-input" placeholder="es. Lidl" autocomplete="off" value="${prezzoRec?.negozioNome || ''}" />
                        <div class="ac-dropdown edit-negozio-dropdown"></div>
                    </div>
                </div>
                <div class="field"><label>Promo</label>
                    <select class="edit-promo">
                        <option value="false">No</option>
                        <option value="true">Sì</option>
                    </select>
                </div>
            </div>
            <div class="controlla-edit-actions">
                <button class="btn btn-primary btn-sm spesa-btn-salva"
                    data-prezzo-id="${prezzoId || ''}"
                    data-prodotto-id="${item.prodottoId}"
                    data-variante="${item.variante || ''}"
                    data-lista-id="${item.listaId}">Salva</button>
                <button class="btn btn-ghost btn-sm spesa-btn-annulla" data-edit-id="${editId}">Annulla</button>
            </div>`;
    }

    // ================================================================
    // LISTENER CONDIVISI
    // ================================================================
    function aggiungiListener(contenuto) {
        contenuto.addEventListener('click', async e => {

            if (e.target.closest('.btn-rimuovi-spesa')) {
                const id = parseInt(e.target.closest('.btn-rimuovi-spesa').dataset.id);
                await supabaseClient.from('lista_spesa').delete().eq('id', id);
                lista = lista.filter(i => i.listaId !== id);
                renderLista();
                return;
            }

            if (e.target.closest('.spesa-btn-controlla')) {
                const nome = e.target.closest('.spesa-btn-controlla').dataset.prodottoNome;
                await navigate('controlla');
                const input = document.getElementById('inputCercaProdotto');
                if (input) { input.value = nome; input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }
                return;
            }

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
                const editId = btn.dataset.listaId
                    ? (btn.closest('tr')?.id?.includes('neg') ? `spesa-edit-neg-${btn.dataset.listaId}` : `spesa-edit-${btn.dataset.listaId}`)
                    : null;
                const editRow = btn.closest('tr')?.nextElementSibling;
                if (!editRow) return;
                const aperto = editRow.style.display !== 'none';
                editRow.style.display = aperto ? 'none' : 'table-row';
                btn.textContent = aperto ? '✎' : '✕';
                if (!aperto) {
                    const editBox = editRow.querySelector('.controlla-edit-box');
                    if (editBox && !editBox.dataset.acInit) {
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
                }
                return;
            }

            if (e.target.closest('.spesa-btn-annulla')) {
                const editId = e.target.closest('.spesa-btn-annulla').dataset.editId;
                const editRow = document.getElementById(editId);
                if (editRow) editRow.style.display = 'none';
                const listaId = editId.replace('spesa-edit-neg-', '').replace('spesa-edit-', '');
                const btnAgg = contenuto.querySelector(`.spesa-btn-aggiorna[data-lista-id="${listaId}"]`);
                if (btnAgg) btnAgg.textContent = '✎';
                return;
            }

            if (e.target.closest('.spesa-btn-salva')) {
                const btn = e.target.closest('.spesa-btn-salva');
                const editRow = btn.closest('tr');
                const editBox = editRow.querySelector('.controlla-edit-box');
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

    renderLista();
}