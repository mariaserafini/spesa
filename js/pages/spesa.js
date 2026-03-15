// ============================================================
// SPESA.JS
// ============================================================

async function renderSpesa() {
    document.getElementById('app').innerHTML = `
        <div class="page-header"><h1>Lista della spesa</h1></div>
        <div class="card">
            <div class="field" style="margin:0">
                <label for="inputSpesaProdotto">Aggiungi prodotto</label>
                <div class="spesa-input-row">
                    <div class="ac-wrapper" style="flex:1">
                        <input type="text" id="inputSpesaProdotto"
                               placeholder="es. noci, ceci, tahina…" autocomplete="off" />
                        <div class="ac-dropdown" id="dropdownSpesa"></div>
                    </div>
                    <button class="btn btn-primary" id="btnAggiungiSpesa">Aggiungi</button>
                </div>
            </div>
        </div>
        <div id="spesaWrap"></div>`;
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
    const { data: prezziDB } = await supabaseClient
        .from('prezzi')
        .select('id, fkprodotto, variante, prezzo, quantita, unita, prezzounita, note, datarilevazione, negozi(id, nome, filiale)')
        .gte('datarilevazione', soglia);

    const prezziPerProdotto = {};
    for (const r of (prezziDB || [])) {
        if (!prezziPerProdotto[r.fkprodotto]) prezziPerProdotto[r.fkprodotto] = [];
        prezziPerProdotto[r.fkprodotto].push({
            prezzoId: r.id, variante: r.variante,
            prezzo: r.prezzo, quantita: r.quantita, unita: r.unita,
            prezzounita: r.prezzounita, note: r.note, data: r.datarilevazione,
            negozioId: r.negozi.id,
            negozioNome: r.negozi.filiale ? `${r.negozi.nome} (${r.negozi.filiale})` : r.negozi.nome,
            negozioNomeBase: r.negozi.nome,
        });
    }
    for (const id in prezziPerProdotto)
        prezziPerProdotto[id].sort((a, b) => a.prezzounita - b.prezzounita);

    let lista = (listaDB || []).map(r => ({
        listaId: r.id, prodottoId: r.fkprodotto, variante: r.variante,
        nome: r.prodotti.nome, unita: r.prodotti.unita,
    }));

    function prezziItem(item) {
        const tutti = prezziPerProdotto[item.prodottoId] || [];
        if (item.variante !== null && item.variante !== undefined) {
            const f = tutti.filter(p => p.variante === item.variante);
            return f.length > 0 ? f : [];
        }
        const senzaVar = tutti.filter(p => !p.variante);
        return senzaVar.length > 0 ? senzaVar : tutti;
    }

    let prodottoScelto = null;
    let vistaCorrente = 'negozio';

    creaAutocomplete({
        input: document.getElementById('inputSpesaProdotto'),
        dropdown: document.getElementById('dropdownSpesa'),
        lista: prodotti, mostraNuovo: true,
        onSelect: (p) => { prodottoScelto = p; },
        onNuovo: async (testo) => {
            const nome = normalizzaProdotto(testo);
            if (!nome) return;
            const { data, error } = await supabaseClient.from('prodotti')
                .insert({ nome, categoria: 'Altro', unita: 'kg' })
                .select('id, nome, unita, categoria').single();
            if (error) { alert('Errore.'); return; }
            prodotti.push(data); prodottoScelto = data;
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
            .map(p => p.variante).filter((v, i, a) => a.indexOf(v) === i);
        const righeNuove = variantiEsistenti.length > 0 ? variantiEsistenti : [null];
        const righeFiltered = righeNuove.filter(v =>
            !lista.find(i => i.prodottoId === prodottoScelto.id && i.variante === v));
        if (righeFiltered.length === 0) {
            document.getElementById('inputSpesaProdotto').value = '';
            prodottoScelto = null; return;
        }
        const { data, error } = await supabaseClient.from('lista_spesa')
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

    // ================================================================
    // RENDER LISTA
    // ================================================================
    function renderLista() {
        const wrap = document.getElementById('spesaWrap');
        if (lista.length === 0) {
            wrap.innerHTML = `<p class="text-muted" style="margin-top:1rem">Lista vuota.</p>`; return;
        }
        wrap.innerHTML = `
            <div class="spesa-toolbar">
                <span class="text-muted" style="font-size:.85rem">${lista.length} prodott${lista.length === 1 ? 'o' : 'i'}</span>
                <div class="spesa-vista-toggle">
                    <button class="btn-vista ${vistaCorrente === 'negozio' ? 'attiva' : ''}" data-vista="negozio">Negozio</button>
                    <button class="btn-vista ${vistaCorrente === 'prodotto' ? 'attiva' : ''}" data-vista="prodotto">Prodotto</button>
                </div>
                <button class="btn btn-ghost btn-sm" id="btnSvuotaSpesa">Svuota</button>
            </div>
            <div id="spesaContenuto"></div>`;
        wrap.querySelector('.spesa-vista-toggle').addEventListener('click', e => {
            const b = e.target.closest('.btn-vista'); if (!b) return;
            vistaCorrente = b.dataset.vista; renderLista();
        });
        wrap.querySelector('#btnSvuotaSpesa').addEventListener('click', async () => {
            if (!confirm('Svuotare tutta la lista?')) return;
            await supabaseClient.from('lista_spesa').delete().neq('id', 0);
            lista = []; renderLista();
        });
        const contenuto = document.getElementById('spesaContenuto');
        if (vistaCorrente === 'prodotto') renderVistaProdotto(contenuto);
        else renderVistaNegozio(contenuto);
    }

    // ================================================================
    // VISTA PER PRODOTTO
    // Card per ogni prodotto, 2 negozi migliori come righe
    // ================================================================
    function renderVistaProdotto(contenuto) {
        const listaOrd = [...lista].sort((a, b) =>
            a.nome.localeCompare(b.nome) || (a.variante || '').localeCompare(b.variante || ''));

        const html = listaOrd.map(item => {
            const prezzi = prezziItem(item);
            const n1 = prezzi[0] || null;
            const n2 = prezzi[1] || null;
            const pct = n1 && n2 ? Math.round((n2.prezzounita - n1.prezzounita) / n1.prezzounita * 100) : 0;

            const titolo = `${item.nome}${item.variante ? ' <span class="sl-variante">' + item.variante + '</span>' : ''}`;
            const riga_nessuno = `<div class="sl-dati text-muted" style="font-size:.82rem">Nessun prezzo recente<div class="sl-header-azioni">
                                <button class="btn-azione btn-aggiorna sl-aggiorna" data-lista-id="${item.listaId}" data-prezzo-id="" title="Aggiungi rilevazione">✎</button></div>
                            </div>`;
            const riga = (n, scarto, bottoni) => n ? `
                <div class="sl-riga">
                    <button class="sl-negozio sl-link" data-negozio-id="${n.negozioId}" data-negozio-nome="${n.negozioNomeBase}">${n.negozioNome}</button>
                    <div class="sl-dati">
                        <span class="sl-prezzo">€ ${parseFloat(n.prezzounita).toFixed(2)}/${item.unita}</span>
                        ${scarto ? `<span class="controlla-scarto" style="margin-left:.25rem">+${scarto}%</span>` : ''}
                        <span class="sl-formato">${n.quantita}${n.unita}</span>
                        ${n.note ? `<span class="sl-note">${n.note}</span>` : ''}
                       ${bottoni}
                    </div>
                </div>` : '';

            const noteItem = n1?.note ? `<div class="sl-note-prodotto">${n1.note}</div>` : '';
            const editId = `spesa-edit-${item.listaId}`;
            const bottoni = `<button class="btn-azione btn-conferma sl-conferma" data-id="${item.prezzoId}" title="Conferma">✓</button>
                        <button class="btn-azione btn-aggiorna sl-aggiorna" data-lista-id="${item.listaId}" data-prezzo-id="${item.prezzoId || ''}" title="Modifica">✎</button>`;
            return `
                <div class="sl-card card">
                    <div class="sl-header">
                        <div>
                            <button class="sl-nome" data-prodotto-nome="${item.nome}">${titolo}</button>
                        </div>
                        <div class="sl-header-azioni">
                            <button class="btn-azione sl-rimuovi" data-lista-id="${item.listaId}" title="Rimuovi" style="background:#fee2e2;color:#9b1c1c;border-color:#f5c0c0">✕</button>
                        </div>
                    </div>
                    ${riga(n1, 0, bottoni)}  
                    ${riga(n2, pct, '')}
                    ${!n1 ? riga_nessuno : ''}
                    <div class="sl-edit" id="${editId}" style="display:none">
                        ${buildEditForm(editId, n1, item)}
                    </div>
                </div>`;
        }).join('');

        contenuto.innerHTML = html || `<p class="text-muted" style="margin-top:1rem">Nessun prodotto.</p>`;
        aggiungiListener(contenuto);
    }

    // ================================================================
    // VISTA PER NEGOZIO
    // Card per negozio migliore, lista prodotti
    // ================================================================
    function renderVistaNegozio(contenuto) {
        const perNegozio = {};
        for (const item of lista) {
            const prezzi = prezziItem(item);
            const n = prezzi[0] || null;
            const key = n ? n.negozioId : '__nessuno__';
            if (!perNegozio[key]) perNegozio[key] = { negozioId: n?.negozioId, negozioNome: n?.negozioNome, negozioNomeBase: n?.negozioNomeBase, items: [] };
            perNegozio[key].items.push({ item, n });
        }

        const keys = Object.keys(perNegozio).filter(k => k !== '__nessuno__')
            .sort((a, b) => perNegozio[b].items.length - perNegozio[a].items.length);
        if (perNegozio['__nessuno__']) keys.push('__nessuno__');

        const html = keys.map(key => {
            const { negozioId, negozioNome, negozioNomeBase, items } = perNegozio[key];
            const nessuno = key === '__nessuno__';
            const prodottiOrd = [...items].sort((a, b) => a.item.nome.localeCompare(b.item.nome));

            const righe = prodottiOrd.map(({ item, n }) => {
                const prezzi = prezziItem(item);
                const n2 = prezzi[1] || null;
                const pct = n && n2 ? Math.round((n2.prezzounita - n.prezzounita) / n.prezzounita * 100) : 0;
                const editId = `spesa-edit-neg-${item.listaId}`;

                return `
                    <div class="sl-riga sl-riga-negozio">
                        <div class="sl-riga-top">
                          <div class="sl-header-azioni">
                         <button class="btn-azione sl-rimuovi" data-lista-id="${item.listaId}" title="Rimuovi" style="background:#fee2e2;color:#9b1c1c;border-color:#f5c0c0">✕</button>
                         </div>
                            <div>
                                <button class="sl-nome" data-prodotto-nome="${item.nome}">${item.nome}${item.variante ? ` <span class="sl-variante">${item.variante}</span>` : ''}</button>
                                ${n?.note ? `<div class="sl-note-prodotto">${n.note}</div>` : ''}
                            </div>
                        </div>
                        ${n ? `<div class="sl-dati">
                            <span class="sl-prezzo">€ ${parseFloat(n.prezzounita).toFixed(2)}/${item.unita}</span>
                            <span class="sl-formato">${n.quantita}${n.unita}</span>
                             <div class="sl-header-azioni">
                                ${n ? `<button class="btn-azione btn-conferma sl-conferma" data-id="${n.prezzoId}" title="Conferma">✓</button>` : ''}
                                <button class="btn-azione btn-aggiorna sl-aggiorna" data-lista-id="${item.listaId}" data-prezzo-id="${n?.prezzoId || ''}" title="Modifica">✎</button>
                               
                            </div> :
                            ${n2 ? `<span class="sl-alt"><button class="sl-link" data-negozio-id="${n2.negozioId}" data-negozio-nome="${n2.negozioNomeBase}">${n2.negozioNome}</button> € ${parseFloat(n2.prezzounita).toFixed(2)} <span class="controlla-scarto">+${pct}%</span></span>` : ''}
                        </div>` : `<div class="sl-dati text-muted" style="font-size:.82rem">Nessun prezzo recente</div><div class="sl-header-azioni">
                                <button class="btn-azione btn-aggiorna sl-aggiorna" data-lista-id="${item.listaId}" data-prezzo-id="" title="Aggiungi rilevazione">✎</button>
                            </div>`}
                        <div class="sl-edit" id="${editId}" style="display:none">
                            ${buildEditForm(editId, n, item)}
                        </div>
                    </div>`;
            }).join('');

            return `
                <div class="sl-sezione card">
                    <div class="sl-sezione-header">
                        ${nessuno
                    ? `<span class="sl-sezione-nome">⚠️ Senza prezzo recente</span>`
                    : `<button class="sl-sezione-nome sl-link" data-negozio-id="${negozioId}" data-negozio-nome="${negozioNomeBase}">🏪 ${negozioNome}</button>`}
                        <span class="analizza-box-count">${items.length}</span>
                    </div>
                    ${righe}
                </div>`;
        }).join('');

        contenuto.innerHTML = html;
        aggiungiListener(contenuto);
    }

    // ================================================================
    // FORM MODIFICA
    // ================================================================
    function buildEditForm(editId, n, item) {
        const unita = n?.unita || item.unita || 'kg';
        return `
            <div class="controlla-edit-box">
                <div class="controlla-edit-fields">
                    <div class="field"><label>Prezzo (€)</label>
                        <input type="number" class="edit-prezzo" value="${n?.prezzo || ''}" min="0" step="0.01" />
                    </div>
                    <div class="field"><label>Quantità</label>
                        <input type="number" class="edit-quantita" value="${n?.quantita || ''}" min="0" step="any" />
                    </div>
                    <div class="field"><label>Unità</label>
                        <select class="edit-unita">
                            ${['g', 'kg', 'mg', 'ml', 'cl', 'dl', 'l', 'pz'].map(u =>
            `<option value="${u}" ${u === unita ? 'selected' : ''}>${u}</option>`).join('')}
                        </select>
                    </div>
                    <div class="field"><label>Variante</label>
                        <input type="text" class="edit-variante" value="${item.variante || ''}" placeholder="nessuna" />
                    </div>
                    <div class="field"><label>Negozio</label>
                        <div class="ac-wrapper">
                            <input type="text" class="edit-negozio-input" placeholder="es. Lidl"
                                autocomplete="off" value="${n?.negozioNome || ''}" />
                            <div class="ac-dropdown edit-negozio-dropdown"></div>
                        </div>
                    </div>
                    <div class="field edit-field-note"><label>Note</label>
                        <input type="text" class="edit-note" value="${n?.note || ''}" placeholder="opzionale" />
                    </div>
                </div>
                <div class="controlla-edit-actions">
                    <button class="btn btn-primary btn-sm sl-salva"
                        data-edit-id="${editId}"
                        data-prezzo-id="${n?.prezzoId || ''}"
                        data-prodotto-id="${item.prodottoId}"
                        data-variante="${item.variante || ''}"
                        data-lista-id="${item.listaId}">Salva</button>
                    <button class="btn btn-ghost btn-sm sl-annulla" data-edit-id="${editId}">Annulla</button>
                </div>
            </div>`;
    }

    // ================================================================
    // LISTENER
    // ================================================================
    function aggiungiListener(contenuto) {
        contenuto.addEventListener('click', async e => {

            // Vai a Controlla prodotto
            if (e.target.closest('.sl-nome[data-prodotto-nome]')) {
                const b = e.target.closest('.sl-nome');
                await navigate('controlla');
                const input = document.getElementById('inputCercaProdotto');
                if (input) { input.value = b.dataset.prodottoNome; input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }
                return;
            }

            // Vai ad Analizza negozio
            if (e.target.closest('.sl-link[data-negozio-id]')) {
                const b = e.target.closest('.sl-link[data-negozio-id]');
                navigate('analizza', { negozio: { id: parseInt(b.dataset.negozioId), nome: b.dataset.negozioNome, filiale: null } });
                return;
            }

            // Rimuovi
            if (e.target.closest('.sl-rimuovi')) {
                const listaId = parseInt(e.target.closest('.sl-rimuovi').dataset.listaId);
                await supabaseClient.from('lista_spesa').delete().eq('id', listaId);
                lista = lista.filter(i => i.listaId !== listaId);
                renderLista(); return;
            }

            // Conferma
            if (e.target.closest('.sl-conferma')) {
                const btn = e.target.closest('.sl-conferma');
                btn.disabled = true; btn.textContent = '…';
                const { error } = await supabaseClient.from('prezzi')
                    .update({ datarilevazione: new Date().toISOString().slice(0, 10) })
                    .eq('id', btn.dataset.id);
                btn.disabled = false;
                btn.textContent = error ? '✗' : '✓';
                if (!error) { btn.style.background = '#e2efda'; btn.style.color = '#276228'; }
                return;
            }

            // Toggle modifica
            if (e.target.closest('.sl-aggiorna')) {
                const btn = e.target.closest('.sl-aggiorna');
                const listaId = btn.dataset.listaId;
                // Trova la sl-edit più vicina
                const card = btn.closest('.sl-card, .sl-riga-negozio');
                const editDiv = card?.querySelector('.sl-edit');
                if (!editDiv) return;
                const aperto = editDiv.style.display !== 'none';
                editDiv.style.display = aperto ? 'none' : 'block';
                btn.textContent = aperto ? '✎' : '✕';
                if (!aperto && !editDiv.dataset.acInit) {
                    editDiv.dataset.acInit = '1';
                    const { data: negozi } = await supabaseClient.from('negozi').select('id, nome, filiale').order('nome');
                    creaAutocomplete({
                        input: editDiv.querySelector('.edit-negozio-input'),
                        dropdown: editDiv.querySelector('.edit-negozio-dropdown'),
                        lista: negozi, mostraNuovo: false,
                        onSelect: (n) => { editDiv.dataset.negozioId = n.id; editDiv.querySelector('.edit-negozio-input').value = n.nome; },
                        onNuovo: () => { }
                    });
                }
                return;
            }

            // Annulla
            if (e.target.closest('.sl-annulla')) {
                const editId = e.target.closest('.sl-annulla').dataset.editId;
                const editDiv = document.getElementById(editId);
                if (editDiv) editDiv.style.display = 'none';
                const card = editDiv?.closest('.sl-card, .sl-riga-negozio');
                const btnAgg = card?.querySelector('.sl-aggiorna');
                if (btnAgg) btnAgg.textContent = '✎';
                return;
            }

            // Salva
            if (e.target.closest('.sl-salva')) {
                const btn = e.target.closest('.sl-salva');
                const editId = btn.dataset.editId;
                const editDiv = document.getElementById(editId);
                const prezzoId = btn.dataset.prezzoId;
                const prodottoId = parseInt(btn.dataset.prodottoId);
                const variante = btn.dataset.variante || null;
                const listaId = parseInt(btn.dataset.listaId);
                const prezzo = parseFloat(editDiv.querySelector('.edit-prezzo').value);
                const quantita = parseFloat(editDiv.querySelector('.edit-quantita').value);
                const unita = editDiv.querySelector('.edit-unita').value;
                const varianteEdit = editDiv.querySelector('.edit-variante').value.trim().toLowerCase() || null;
                const note = editDiv.querySelector('.edit-note').value.trim() || null;
                const negozioId = parseInt(editDiv.dataset.negozioId);
                if (isNaN(prezzo) || isNaN(quantita) || !unita || isNaN(negozioId)) {
                    alert('Compila tutti i campi, incluso il negozio.'); return;
                }
                const prezzounita = calcolaPrezzoPer(prezzo, quantita, unita);
                btn.disabled = true; btn.textContent = '…';
                let error;
                if (prezzoId) {
                    ({ error } = await supabaseClient.from('prezzi')
                        .update({
                            prezzo, quantita, unita, prezzounita, variante: varianteEdit, note,
                            datarilevazione: new Date().toISOString().slice(0, 10)
                        }).eq('id', prezzoId));
                } else {
                    ({ error } = await supabaseClient.from('prezzi')
                        .insert({
                            fkprodotto: prodottoId, fknegozio: negozioId, variante: varianteEdit,
                            prezzo, quantita, unita, prezzounita, note,
                            datarilevazione: new Date().toISOString().slice(0, 10)
                        }));
                }
                if (error) { btn.disabled = false; btn.textContent = 'Salva'; alert('Errore.'); return; }
                renderSpesa();
            }
        });
    }

    renderLista();
}
