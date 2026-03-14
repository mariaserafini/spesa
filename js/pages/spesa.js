// ============================================================
// SPESA.JS — lista della spesa
// Vista negozio: struttura identica ad analizza.js "Da comprare"
// Vista prodotto: struttura identica a controlla.js (max 2 negozi)
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
        .select('id, fkprodotto, variante, prezzo, quantita, unita, prezzounita, promozione, note, datarilevazione, negozi(id, nome, filiale)')
        .gte('datarilevazione', soglia);

    // Mappa prezziPerProdotto[fkprodotto] → array ordinato per prezzounita
    const prezziPerProdotto = {};
    for (const r of (prezziDB || [])) {
        if (!prezziPerProdotto[r.fkprodotto]) prezziPerProdotto[r.fkprodotto] = [];
        prezziPerProdotto[r.fkprodotto].push({
            prezzoId: r.id,
            variante: r.variante,
            prezzo: r.prezzo,
            quantita: r.quantita,
            unita: r.unita,
            prezzounita: r.prezzounita,
            promozione: r.promozione,
            note: r.note,
            data: r.datarilevazione,
            negozioId: r.negozi.id,
            negozioNome: r.negozi.filiale
                ? `${r.negozi.nome} (${r.negozi.filiale})`
                : r.negozi.nome,
            negozioNomeBase: r.negozi.nome,
        });
    }
    for (const id in prezziPerProdotto)
        prezziPerProdotto[id].sort((a, b) => a.prezzounita - b.prezzounita);

    let lista = (listaDB || []).map(r => ({
        listaId: r.id,
        prodottoId: r.fkprodotto,
        variante: r.variante,
        nome: r.prodotti.nome,
        unita: r.prodotti.unita,
    }));

    // Restituisce i prezzi recenti per un item (filtra per variante esatta)
    function prezziItem(item) {
        const tutti = prezziPerProdotto[item.prodottoId] || [];
        if (item.variante !== null && item.variante !== undefined) {
            const filtrati = tutti.filter(p => p.variante === item.variante);
            return filtrati.length > 0 ? filtrati : [];
        }
        const senzaVar = tutti.filter(p => !p.variante);
        return senzaVar.length > 0 ? senzaVar : tutti;
    }

    let prodottoScelto = null;
    let vistaCorrente = 'negozio';

    // ---- Autocomplete ----
    creaAutocomplete({
        input: document.getElementById('inputSpesaProdotto'),
        dropdown: document.getElementById('dropdownSpesa'),
        lista: prodotti, mostraNuovo: true,
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
    // renderLista — toolbar + vista corrente
    // ================================================================
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
            const btn = e.target.closest('.btn-vista'); if (!btn) return;
            vistaCorrente = btn.dataset.vista; renderLista();
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
    // VISTA PER NEGOZIO
    // Identica ad analizza "Da comprare": sezioni card per negozio.
    // Colonne: Prodotto | €/unità | Formato | Rilevazione+azioni
    // ================================================================
    function renderVistaNegozio(contenuto) {
        // Raggruppa per negozio migliore
        const perNegozio = {};
        for (const item of lista) {
            const prezzi = prezziItem(item);
            const n = prezzi[0] || null;
            const key = n ? `${n.negozioId}` : '__nessuno__';
            if (!perNegozio[key]) perNegozio[key] = {
                negozioId: n?.negozioId,
                negozioNome: n?.negozioNome,
                negozioNomeBase: n?.negozioNomeBase,
                items: []
            };
            perNegozio[key].items.push({ item, n });
        }

        const keys = Object.keys(perNegozio).filter(k => k !== '__nessuno__')
            .sort((a, b) => perNegozio[b].items.length - perNegozio[a].items.length || perNegozio[a].negozioNome.localeCompare(perNegozio[b].negozioNome));
        if (perNegozio['__nessuno__']) keys.push('__nessuno__');

        const wrap = document.createElement('div');

        keys.forEach(key => {
            const { negozioId, negozioNome, negozioNomeBase, items } = perNegozio[key];
            const nessuno = key === '__nessuno__';

            // Ordine alfabetico prodotti
            const itemsOrdinati = [...items].sort((a, b) => a.item.nome.localeCompare(b.item.nome));
            const unitaBase = itemsOrdinati[0]?.item.unita || 'kg';

            const righeHtml = itemsOrdinati.map(({ item, n }) => {
                const varHtml = item.variante ? `<div class="controlla-note">${item.variante}</div>` : '';
                const noteHtml = n?.note ? `<div class="controlla-note">${n.note}</div>` : '';
                const { testo: tempoTesto, badge: tempoBadge } = n ? calcolaEtaTesto(n.data) : { testo: '—', badge: '' };
                const promoHtml = '';
                const formatoMobile = n?.quantita ? `<span class="controlla-formato-mobile">${n.quantita}${n.unita}</span>` : '';
                const prezzoHtml = n ? `€ ${parseFloat(n.prezzounita).toFixed(2)}` : '—';
                const fmtHtml = n ? `${n.quantita}${n.unita}<br>(€ ${parseFloat(n.prezzo).toFixed(2)})` : '';

                return `
                    <tr data-prezzo-id="${n?.prezzoId || ''}" data-lista-id="${item.listaId}">
                        <td>
                            <div class="controlla-negozio analizza-nome-row">
                                <button class="btn-nome spesa-btn-controlla" data-prodotto-nome="${item.nome}">${item.nome}</button>
                            </div>
                            ${varHtml}${noteHtml}
                        </td>
                        <td class="controlla-prezzo-unita">
                            <div class="prezzo-col">${prezzoHtml}${formatoMobile}</div>
                        </td>
                        <td class="controlla-prezzo-formato">${fmtHtml}</td>
                        <td class="controlla-col-azioni">
                            <div class="controlla-tempo">${tempoTesto} ${tempoBadge}</div>
                            <div class="controlla-badges-row">
                                ${promoHtml}
                                ${n ? `<button class="btn-azione btn-conferma spesa-btn-conferma" data-id="${n.prezzoId}" title="Prezzo ancora valido">✓</button>` : ''}
                                <button class="btn-azione btn-aggiorna spesa-btn-aggiorna" data-id="${n?.prezzoId || ''}" data-lista-id="${item.listaId}" title="${n ? 'Modifica' : 'Aggiungi rilevazione'}">✎</button>
                                <button class="btn-azione spesa-btn-rimuovi" data-lista-id="${item.listaId}" title="Rimuovi dalla lista" style="background:#fee2e2;color:#9b1c1c;border-color:#f5c0c0">✕</button>
                            </div>
                        </td>
                    </tr>
                    <tr class="controlla-edit-row" id="spesa-edit-${item.listaId}" style="display:none">
                        <td colspan="4">${buildEditForm(n, item)}</td>
                    </tr>`;
            }).join('');

            const titoloHtml = nessuno
                ? `<div class="controlla-variante-titolo">⚠️ Senza prezzo recente <span class="analizza-box-count">${items.length}</span></div>`
                : `<div class="controlla-variante-titolo" style="display:flex;align-items:center;gap:.5rem">
                       🏪 <button class="btn-link spesa-btn-analizza" data-negozio-id="${negozioId}" data-negozio-nome="${negozioNomeBase}">${negozioNome}</button>
                       <span class="analizza-box-count">${items.length}</span>
                   </div>`;

            const sezione = document.createElement('div');
            sezione.className = 'controlla-sezione card';
            sezione.innerHTML = `
                ${titoloHtml}
                <div class="table-responsive">
                    <table class="results-table controlla-table">
                        <thead><tr>
                            <th>Prodotto</th>
                            <th>€ / ${unitaBase}</th>
                            <th>Formato</th>
                            <th>Rilevazione</th>
                        </tr></thead>
                        <tbody>${righeHtml}</tbody>
                    </table>
                </div>`;
            wrap.appendChild(sezione);
        });

        contenuto.innerHTML = '';
        contenuto.appendChild(wrap);
        aggiungiListener(contenuto);
    }

    // ================================================================
    // VISTA PER PRODOTTO
    // Identica a controlla: sezioni card per prodotto (come varianti).
    // Mostra max 2 negozi. Nessun badge "migliore". X nel titolo.
    // ================================================================
    function renderVistaProdotto(contenuto) {
        const listaOrdinata = [...lista].sort((a, b) =>
            a.nome.localeCompare(b.nome) || (a.variante || '').localeCompare(b.variante || ''));

        const wrap = document.createElement('div');

        listaOrdinata.forEach(item => {
            const prezzi = prezziItem(item);
            const top2 = prezzi.slice(0, 2);
            const prezzoMin = top2[0]?.prezzounita || 0;
            const unitaBase = item.unita;

            const righeHtml = top2.map((n, i) => {
                const negozioLabel = `<button class="btn-link spesa-btn-analizza" data-negozio-id="${n.negozioId}" data-negozio-nome="${n.negozioNomeBase}">${n.negozioNome}</button>`;
                const { testo: tempoTesto, badge: tempoBadge } = calcolaEtaTesto(n.data);
                const promoHtml = '';
                const scartoPct = i === 0 ? '' : `<div class="controlla-scarto">+${Math.round((n.prezzounita - prezzoMin) / prezzoMin * 100)}%</div>`;
                const formatoMobile = n.quantita ? `<span class="controlla-formato-mobile">${n.quantita}${n.unita}</span>` : '';
                const noteHtml = n.note ? `<div class="controlla-note">${n.note}</div>` : '';

                return `
                    <tr data-prezzo-id="${n.prezzoId}" data-lista-id="${item.listaId}" class="${i === 0 ? 'controlla-best' : ''}">
                        <td>
                            <div class="controlla-negozio">${negozioLabel}</div>
                            ${noteHtml}
                        </td>
                        <td class="controlla-prezzo-unita">
                            <div class="prezzo-col">€ ${parseFloat(n.prezzounita).toFixed(2)}${formatoMobile}${scartoPct}</div>
                        </td>
                        <td class="controlla-prezzo-formato">
                            ${n.quantita}${n.unita}<br>(€ ${parseFloat(n.prezzo).toFixed(2)})
                        </td>
                        <td class="controlla-col-azioni">
                            <div class="controlla-tempo">${tempoTesto} ${tempoBadge}</div>
                            <div class="controlla-badges-row">
                                ${promoHtml}
                                ${i === 0 ? `<button class="btn-azione btn-conferma spesa-btn-conferma" data-id="${n.prezzoId}" title="Prezzo ancora valido">✓</button>` : ''}
                                ${i === 0 ? `<button class="btn-azione btn-aggiorna spesa-btn-aggiorna" data-id="${n.prezzoId}" data-lista-id="${item.listaId}" title="Modifica">✎</button>` : ''}
                            </div>
                        </td>
                    </tr>
                    ${i === 0 ? `<tr class="controlla-edit-row" id="spesa-edit-${item.listaId}" style="display:none">
                        <td colspan="4">${buildEditForm(n, item)}</td>
                    </tr>` : ''}`;
            }).join('');

            // Se nessun prezzo disponibile
            const nessunPrezzoHtml = top2.length === 0 ? `
                <tr><td colspan="4" style="padding:.75rem 1rem">
                    <div style="display:flex;align-items:center;justify-content:space-between">
                        <span class="text-muted" style="font-size:.85rem">Nessun prezzo recente</span>
                        <button class="btn-azione btn-aggiorna spesa-btn-aggiorna" data-id="" data-lista-id="${item.listaId}" title="Aggiungi rilevazione">✎</button>
                    </div>
                </td></tr>
                <tr class="controlla-edit-row" id="spesa-edit-${item.listaId}" style="display:none">
                    <td colspan="4">${buildEditForm(null, item)}</td>
                </tr>` : '';

            const titoloVariante = item.variante
                ? `<div class="controlla-variante-titolo" style="display:flex;align-items:center;justify-content:space-between">
                       <span>${item.nome} <span style="font-weight:400;text-transform:none">${item.variante}</span></span>
                       <button class="spesa-btn-rimuovi btn-link" data-lista-id="${item.listaId}" style="color:var(--muted);font-size:.8rem" title="Rimuovi dalla lista">✕</button>
                   </div>`
                : `<div class="controlla-variante-titolo" style="display:flex;align-items:center;justify-content:space-between">
                       <span>${item.nome}</span>
                       <button class="spesa-btn-rimuovi btn-link" data-lista-id="${item.listaId}" style="color:var(--muted);font-size:.8rem" title="Rimuovi dalla lista">✕</button>
                   </div>`;

            const sezione = document.createElement('div');
            sezione.className = 'controlla-sezione card';
            sezione.innerHTML = `
                ${titoloVariante}
                <div class="table-responsive">
                    <table class="results-table controlla-table">
                        <thead><tr>
                            <th>Negozio</th>
                            <th>€ / ${unitaBase}</th>
                            <th>Formato</th>
                            <th>Rilevazione</th>
                        </tr></thead>
                        <tbody>${righeHtml}${nessunPrezzoHtml}</tbody>
                    </table>
                </div>`;
            wrap.appendChild(sezione);
        });

        contenuto.innerHTML = '';
        contenuto.appendChild(wrap);
        aggiungiListener(contenuto);
    }

    // ================================================================
    // FORM MODIFICA — identico a controlla/analizza
    // ================================================================
    function buildEditForm(n, item) {
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
                    <div class="field"><label>Promo</label>
                        <select class="edit-promo">
                            <option value="false" ${!n?.promozione ? 'selected' : ''}>No</option>
                            <option value="true"  ${n?.promozione ? 'selected' : ''}>Sì</option>
                        </select>
                    </div>
                    <div class="field edit-field-note"><label>Note</label>
                        <input type="text" class="edit-note" value="${n?.note || ''}" placeholder="opzionale" />
                    </div>
                </div>
                <div class="controlla-edit-actions">
                    <button class="btn btn-primary btn-sm spesa-btn-salva"
                        data-prezzo-id="${n?.prezzoId || ''}"
                        data-prodotto-id="${item.prodottoId}"
                        data-lista-id="${item.listaId}">Salva</button>
                    <button class="btn btn-ghost btn-sm spesa-btn-annulla"
                        data-lista-id="${item.listaId}">Annulla</button>
                </div>
            </div>`;
    }

    // ================================================================
    // LISTENER CONDIVISI
    // ================================================================
    function aggiungiListener(contenuto) {
        contenuto.addEventListener('click', async e => {

            // Rimuovi dalla lista
            if (e.target.closest('.spesa-btn-rimuovi')) {
                const listaId = parseInt(e.target.closest('.spesa-btn-rimuovi').dataset.listaId);
                await supabaseClient.from('lista_spesa').delete().eq('id', listaId);
                lista = lista.filter(i => i.listaId !== listaId);
                renderLista(); return;
            }

            // Vai a Controlla
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

            // Conferma data
            if (e.target.closest('.spesa-btn-conferma')) {
                const btn = e.target.closest('.spesa-btn-conferma');
                btn.disabled = true; btn.textContent = '…';
                const { error } = await supabaseClient.from('prezzi')
                    .update({ datarilevazione: new Date().toISOString().slice(0, 10) })
                    .eq('id', btn.dataset.id);
                btn.disabled = false;
                if (!error) {
                    btn.textContent = '✓'; btn.style.background = '#e2efda'; btn.style.color = '#276228';
                    const td = btn.closest('tr')?.querySelector('.controlla-tempo');
                    if (td) td.innerHTML = 'oggi';
                } else { btn.textContent = '✗'; }
                return;
            }

            // Toggle form modifica
            if (e.target.closest('.spesa-btn-aggiorna')) {
                const btn = e.target.closest('.spesa-btn-aggiorna');
                const listaId = btn.dataset.listaId;
                const editRow = document.getElementById(`spesa-edit-${listaId}`);
                if (!editRow) return;
                const aperto = editRow.style.display !== 'none';
                editRow.style.display = aperto ? 'none' : 'table-row';
                btn.textContent = aperto ? '✎' : '✕';
                // Init autocomplete negozio al primo apertura
                if (!aperto && !editRow.dataset.acInit) {
                    editRow.dataset.acInit = '1';
                    const { data: negozi } = await supabaseClient.from('negozi').select('id, nome, filiale').order('nome');
                    const box = editRow.querySelector('.controlla-edit-box');
                    creaAutocomplete({
                        input: box.querySelector('.edit-negozio-input'),
                        dropdown: box.querySelector('.edit-negozio-dropdown'),
                        lista: negozi, mostraNuovo: false,
                        onSelect: (n) => { box.dataset.negozioId = n.id; box.querySelector('.edit-negozio-input').value = n.nome; },
                        onNuovo: () => { }
                    });
                }
                return;
            }

            // Annulla modifica
            if (e.target.closest('.spesa-btn-annulla')) {
                const listaId = e.target.closest('.spesa-btn-annulla').dataset.listaId;
                const editRow = document.getElementById(`spesa-edit-${listaId}`);
                if (editRow) editRow.style.display = 'none';
                const btnAgg = contenuto.querySelector(`.spesa-btn-aggiorna[data-lista-id="${listaId}"]`);
                if (btnAgg) btnAgg.textContent = '✎';
                return;
            }

            // Salva modifica
            if (e.target.closest('.spesa-btn-salva')) {
                const btn = e.target.closest('.spesa-btn-salva');
                const listaId = parseInt(btn.dataset.listaId);
                const prezzoId = btn.dataset.prezzoId;
                const prodottoId = parseInt(btn.dataset.prodottoId);
                const item = lista.find(i => i.listaId === listaId);
                if (!item) return;

                const editRow = document.getElementById(`spesa-edit-${listaId}`);
                const box = editRow.querySelector('.controlla-edit-box');
                const prezzo = parseFloat(box.querySelector('.edit-prezzo').value);
                const quantita = parseFloat(box.querySelector('.edit-quantita').value);
                const unita = box.querySelector('.edit-unita').value;
                const variante = box.querySelector('.edit-variante').value.trim().toLowerCase() || null;
                const promo = box.querySelector('.edit-promo').value === 'true';
                const note = box.querySelector('.edit-note').value.trim() || null;
                const negozioId = parseInt(box.dataset.negozioId);

                if (isNaN(prezzo) || isNaN(quantita) || !unita || isNaN(negozioId)) {
                    alert('Compila tutti i campi, incluso il negozio.'); return;
                }
                const prezzounita = calcolaPrezzoPer(prezzo, quantita, unita);
                btn.disabled = true; btn.textContent = '…';

                let error;
                if (prezzoId) {
                    ({ error } = await supabaseClient.from('prezzi')
                        .update({
                            prezzo, quantita, unita, prezzounita, variante, promozione: promo, note,
                            datarilevazione: new Date().toISOString().slice(0, 10)
                        })
                        .eq('id', prezzoId));
                } else {
                    ({ error } = await supabaseClient.from('prezzi')
                        .insert({
                            fkprodotto: prodottoId, fknegozio: negozioId, variante,
                            prezzo, quantita, unita, prezzounita, promozione: promo, note,
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