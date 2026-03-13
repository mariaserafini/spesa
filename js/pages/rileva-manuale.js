// ============================================================
// RILEVA-MANUALE.JS — form inserimento manuale
// ============================================================

async function renderRilevaManuale(dati = null) {
    document.getElementById('app').innerHTML = `
        <div class="page-header">
            <h1>Rileva manuale</h1>
        </div>

        <div class="card">

            <!-- PRODOTTO -->
            <div class="field">
                <label for="inputProdotto">
                    Prodotto
                    <span class="badge-nuovo" id="badgeNuovoProdotto" style="display:none">nuovo</span>
                </label>
                <div class="ac-wrapper">
                    <input type="text" id="inputProdotto" placeholder="es. noci, tahina, quinoa…" autocomplete="off" />
                    <div class="ac-dropdown" id="dropdownProdotto"></div>
                </div>
                <div class="nuovo-extra" id="extraProdotto">
                    <div class="label-info">📦 Prodotto non trovato — specifica categoria e unità di misura per aggiungerlo.</div>
                    <div class="form-grid">
                        <div class="field">
                            <label for="nuovaCategoria">Categoria</label>
                            <select id="nuovaCategoria">
                                <option value="">— seleziona —</option>
                                <option>Cereali</option>
                                <option>Condimenti</option>
                                <option>Frutta secca</option>
                                <option>Legumi</option>
                                <option>Semi</option>
                                <option>Verdure</option>
                                <option>Altro</option>
                            </select>
                        </div>
                        <div class="field">
                            <label for="nuovaUnita">Unità di confronto</label>
                            <select id="nuovaUnita">
                                <option value="">— seleziona —</option>
                                <option value="kg">kg</option>
                                <option value="l">l</option>
                                <option value="pz">pz</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div class="divider"></div>

            <!-- NEGOZIO -->
            <div class="field">
                <label for="inputNegozio">
                    Negozio
                    <span class="badge-nuovo" id="badgeNuovoNegozio" style="display:none">nuovo</span>
                </label>
                <div class="ac-wrapper">
                    <input type="text" id="inputNegozio" placeholder="es. Lidl, Esselunga, Koro…" autocomplete="off" />
                    <div class="ac-dropdown" id="dropdownNegozio"></div>
                </div>
                <div class="nuovo-extra" id="extraNegozio">
                    <div class="label-info">🏪 Negozio non trovato — verrà aggiunto automaticamente.</div>
                    <div class="field" style="margin-top:0">
                        <label for="nuovaFiliale">Filiale / città (opzionale)</label>
                        <input type="text" id="nuovaFiliale" placeholder="es. Verona Centro" />
                    </div>
                </div>
            </div>

            <div class="divider"></div>

            <!-- VARIANTE -->
            <div class="field">
                <label for="inputVariante">Variante <span class="text-muted">(opzionale)</span></label>
                <div class="ac-wrapper">
                    <input type="text" id="inputVariante" placeholder="es. sgusciati, sott'olio, cotti…" autocomplete="off" />
                    <div class="ac-dropdown" id="dropdownVariante"></div>
                </div>
            </div>

            <div class="divider"></div>

            <!-- PREZZO / QUANTITÀ / UNITÀ -->
            <div class="row-3">
                <div class="field col-wide">
                    <label for="inputPrezzo">Prezzo (€)</label>
                    <input type="number" id="inputPrezzo" placeholder="0.00" min="0" step="0.01" />
                </div>
                <div class="field">
                    <label for="inputQuantita">Quantità</label>
                    <input type="number" id="inputQuantita" placeholder="500" min="0" step="any" />
                </div>
                <div class="field">
                    <label for="inputUnita">Unità</label>
                    <select id="inputUnita">
                        <option value="">—</option>
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="mg">mg</option>
                        <option value="ml">ml</option>
                        <option value="cl">cl</option>
                        <option value="dl">dl</option>
                        <option value="l">l</option>
                        <option value="pz">pz</option>
                    </select>
                </div>
            </div>

            <div class="prezzo-calcolato" id="prezzoCalcolato">
                <span>Prezzo per unità:</span>
                <span class="valore" id="valoreCalcolato">—</span>
            </div>

            <div class="divider"></div>

            <!-- PROMOZIONE + NOTE -->
            <div class="field">
                <label class="checkbox-field" for="inputPromozione">
                    <input type="checkbox" id="inputPromozione" />
                    <span>🏷️ È un'offerta / promozione</span>
                </label>
            </div>

            <div class="field mt-2">
                <label for="inputNote">Note <span class="text-muted">(opzionale)</span></label>
                <textarea id="inputNote" placeholder="es. marca, confezione multipla, scadenza breve…"></textarea>
            </div>

            <div class="divider"></div>

            <div class="form-actions">
                <button class="btn btn-primary" id="btnSalva">Salva rilevazione</button>
                <button class="btn btn-ghost"   id="btnReset">Ricomincia</button>
            </div>

            <div class="msg msg-error"   id="msgErrore"></div>
            <div class="msg msg-success" id="msgSuccesso"></div>
            <div class="msg msg-warning" id="msgConferma"></div>
        </div>
    `;

    // Inizializza la logica dopo aver iniettato l'HTML
    await initRilevaManuale(dati);
}

async function initRilevaManuale(dati = null) {
    // ---- Stato ----
    let prodotti = [];
    let negozi = [];
    let prodottoSelezionato = null;
    let negozioSelezionato = null;
    let prodottoNuovo = false;
    let negozioNuovo = false;

    // ---- Carica dati dal db ----
    const [resProdotti, resNegozi] = await Promise.all([
        supabaseClient.from('prodotti').select('id, nome, categoria, unita').order('nome'),
        supabaseClient.from('negozi').select('id, nome, filiale').order('nome'),
    ]);

    // DEBUG — rimuovi quando tutto funziona
    console.log('📦 PRODOTTI:', resProdotti.data, '| errore:', resProdotti.error);
    console.log('🏪 NEGOZI:', resNegozi.data, '| errore:', resNegozi.error);

    prodotti = resProdotti.data || [];
    negozi = resNegozi.data || [];

    // ---- UI: stato "nuovo" ----
    function impostaNuovoProdotto(attivo) {
        document.getElementById('inputProdotto').classList.toggle('input-nuovo', attivo);
        document.getElementById('badgeNuovoProdotto').style.display = attivo ? 'inline-block' : 'none';
        document.getElementById('extraProdotto').classList.toggle('visibile', attivo);
    }

    function impostaNuovoNegozio(attivo) {
        document.getElementById('inputNegozio').classList.toggle('input-nuovo', attivo);
        document.getElementById('badgeNuovoNegozio').style.display = attivo ? 'inline-block' : 'none';
        document.getElementById('extraNegozio').classList.toggle('visibile', attivo);
    }

    // ---- Autocomplete ----
    creaAutocomplete({
        input: document.getElementById('inputNegozio'),
        dropdown: document.getElementById('dropdownNegozio'),
        lista: negozi,
        onSelect: (v) => { negozioSelezionato = v; negozioNuovo = false; impostaNuovoNegozio(false); },
        onNuovo: (t) => { negozioSelezionato = null; negozioNuovo = !!t; impostaNuovoNegozio(!!t); }
    });

    // ---- Autocomplete variante ----
    // Viene ricaricato ogni volta che si seleziona un prodotto
    let variantiAC = null;

    async function aggiornaAutocompleteVariante(prodottoId) {
        const { data } = await supabaseClient
            .from('prezzi')
            .select('variante')
            .eq('fkprodotto', prodottoId)
            .not('variante', 'is', null);

        // Deduplica e trasforma in lista compatibile con creaAutocomplete
        const uniche = [...new Set((data || []).map(r => r.variante).filter(Boolean))].sort();
        const listaVarianti = uniche.map(v => ({ id: v, nome: v }));

        variantiAC = listaVarianti;

        creaAutocomplete({
            input: document.getElementById('inputVariante'),
            dropdown: document.getElementById('dropdownVariante'),
            lista: listaVarianti,
            mostraNuovo: false,
            onSelect: (v) => { document.getElementById('inputVariante').value = v.nome; },
            onNuovo: () => { }
        });
    }

    // Aggiorna le varianti quando si seleziona un prodotto esistente
    const acProdottoOriginale = {
        input: document.getElementById('inputProdotto'),
        dropdown: document.getElementById('dropdownProdotto'),
        lista: prodotti,
        onSelect: (v) => {
            prodottoSelezionato = v;
            prodottoNuovo = false;
            impostaNuovoProdotto(false);
            aggiornaAutocompleteVariante(v.id);
        },
        onNuovo: (t) => { prodottoSelezionato = null; prodottoNuovo = !!t; impostaNuovoProdotto(!!t); }
    };
    creaAutocomplete(acProdottoOriginale);

    // ---- Calcolo prezzo per unità in tempo reale ----
    function aggiornaCalcolo() {
        const prezzo = parseFloat(document.getElementById('inputPrezzo').value);
        const quantita = parseFloat(document.getElementById('inputQuantita').value);
        const unita = document.getElementById('inputUnita').value;
        const box = document.getElementById('prezzoCalcolato');
        const val = document.getElementById('valoreCalcolato');

        if (!isNaN(prezzo) && !isNaN(quantita) && unita) {
            const pu = calcolaPrezzoPer(prezzo, quantita, unita);
            if (pu !== null) {
                val.textContent = `€ ${pu.toFixed(2)} / ${UNITA_BASE[unita] || unita}`;
                box.classList.add('visibile');
                return;
            }
        }
        box.classList.remove('visibile');
    }

    ['inputPrezzo', 'inputQuantita', 'inputUnita'].forEach(id => {
        document.getElementById(id).addEventListener('input', aggiornaCalcolo);
        document.getElementById(id).addEventListener('change', aggiornaCalcolo);
    });

    // ---- Reset ----
    function resetForm() {
        ['inputProdotto', 'inputNegozio', 'inputVariante', 'inputPrezzo', 'inputQuantita', 'inputNote']
            .forEach(id => { document.getElementById(id).value = ''; });
        document.getElementById('inputUnita').value = '';
        document.getElementById('inputPromozione').checked = false;
        prodottoSelezionato = null;
        negozioSelezionato = null;
        prodottoNuovo = false;
        negozioNuovo = false;
        impostaNuovoProdotto(false);
        impostaNuovoNegozio(false);
        document.getElementById('prezzoCalcolato').classList.remove('visibile');
    }

    document.getElementById('btnReset').addEventListener('click', () => {
        resetForm();
        document.getElementById('msgErrore').classList.remove('visible');
        document.getElementById('msgSuccesso').classList.remove('visible');
    });

    // ---- Risoluzione prodotto/negozio al salvataggio ----
    // Usata come safety net: se l'utente ha scritto a mano senza cliccare il dropdown,
    // controlla se il testo corrisponde esattamente a un elemento esistente.
    function risolviProdotto(testo) {
        const match = prodotti.find(p => p.nome.toLowerCase() === testo.toLowerCase());
        if (match) {
            prodottoSelezionato = match;
            prodottoNuovo = false;
            impostaNuovoProdotto(false);
        }
        // Se non c'è match e prodottoNuovo è ancora false, probabilmente
        // l'utente ha scritto qualcosa senza usare il dropdown: lo trattiamo come nuovo.
        else if (!prodottoSelezionato) {
            prodottoNuovo = !!testo;
            impostaNuovoProdotto(!!testo);
        }
    }

    function risolviNegozio(testo) {
        const match = negozi.find(n => n.nome.toLowerCase() === testo.toLowerCase());
        if (match) {
            negozioSelezionato = match;
            negozioNuovo = false;
            impostaNuovoNegozio(false);
        }
        else if (!negozioSelezionato) {
            negozioNuovo = !!testo;
            impostaNuovoNegozio(!!testo);
        }
    }

    // ---- Pre-compila il form se arrivano dati da rileva-foto ----
    if (dati) {
        if (dati.daFoto) {
            const banner = document.createElement('div');
            banner.className = 'msg msg-success visible';
            banner.style.marginBottom = '1rem';
            banner.innerHTML = '📷 Dati estratti dalla foto — controlla e correggi se necessario prima di salvare.';
            document.querySelector('.card').prepend(banner);
        }

        if (dati.nomeProdotto) document.getElementById('inputProdotto').value = normalizzaProdotto(dati.nomeProdotto);
        if (dati.nomeNegozio) document.getElementById('inputNegozio').value = normalizzaNegozio(dati.nomeNegozio);
        if (dati.variante) document.getElementById('inputVariante').value = dati.variante.trim().toLowerCase();
        if (dati.prezzo) document.getElementById('inputPrezzo').value = dati.prezzo;
        if (dati.quantita) document.getElementById('inputQuantita').value = dati.quantita;
        if (dati.unita) document.getElementById('inputUnita').value = dati.unita;
        if (dati.note) document.getElementById('inputNote').value = dati.note;
        if (dati.promozione) document.getElementById('inputPromozione').checked = dati.promozione;

        if (dati.nomeProdotto) risolviProdotto(dati.nomeProdotto);
        if (dati.nomeNegozio) risolviNegozio(dati.nomeNegozio);
        aggiornaCalcolo();
    }

    // ---- Salvataggio ----
    document.getElementById('btnSalva').addEventListener('click', async () => {
        const msgErr = document.getElementById('msgErrore');
        const msgOk = document.getElementById('msgSuccesso');
        const msgWarn = document.getElementById('msgConferma');
        msgErr.classList.remove('visible');
        msgOk.classList.remove('visible');
        msgWarn.classList.remove('visible');

        const nomeProdotto = normalizzaProdotto(document.getElementById('inputProdotto').value);
        const nomeNegozio = normalizzaNegozio(document.getElementById('inputNegozio').value);
        const variante = document.getElementById('inputVariante').value.trim().toLowerCase() || null;
        const prezzo = parseFloat(document.getElementById('inputPrezzo').value);
        const quantita = parseFloat(document.getElementById('inputQuantita').value);
        const unita = document.getElementById('inputUnita').value;
        const promozione = document.getElementById('inputPromozione').checked;
        const note = document.getElementById('inputNote').value.trim() || null;

        // Aggiorna i campi visibili con i valori normalizzati
        document.getElementById('inputProdotto').value = nomeProdotto;
        document.getElementById('inputNegozio').value = nomeNegozio;

        // Risolvi prodotto e negozio prima della validazione
        risolviProdotto(nomeProdotto);
        risolviNegozio(nomeNegozio);

        // Validazione
        const errori = [];
        if (!nomeProdotto) errori.push('Inserisci il nome del prodotto.');
        if (!nomeNegozio) errori.push('Inserisci il nome del negozio.');
        if (isNaN(prezzo) || prezzo <= 0) errori.push('Inserisci un prezzo valido.');
        if (isNaN(quantita) || quantita <= 0) errori.push('Inserisci una quantità valida.');
        if (!unita) errori.push("Seleziona l'unità di misura.");
        if (prodottoNuovo) {
            if (!document.getElementById('nuovaCategoria').value) errori.push('Seleziona la categoria del nuovo prodotto.');
            if (!document.getElementById('nuovaUnita').value) errori.push("Seleziona l'unità di confronto del nuovo prodotto.");
        }

        if (errori.length) {
            msgErr.innerHTML = errori.join('<br>');
            msgErr.classList.add('visible');
            return;
        }

        const btn = document.getElementById('btnSalva');
        btn.disabled = true;
        btn.textContent = 'Controllo…';

        try {
            // 1. Risolvi prodotto (crea se nuovo)
            let fkprodotto = prodottoSelezionato?.id;
            if (!fkprodotto) {
                const { data: np, error: ep } = await supabaseClient
                    .from('prodotti')
                    .insert({ nome: nomeProdotto, categoria: document.getElementById('nuovaCategoria').value, unita: document.getElementById('nuovaUnita').value })
                    .select('id').single();
                if (ep) throw ep;
                fkprodotto = np.id;
                prodotti.push({ id: fkprodotto, nome: nomeProdotto });
            }

            // 2. Risolvi negozio (crea se nuovo)
            let fknegozio = negozioSelezionato?.id;
            if (!fknegozio) {
                const { data: nn, error: en } = await supabaseClient
                    .from('negozi')
                    .insert({ nome: nomeNegozio, filiale: document.getElementById('nuovaFiliale').value.trim() || null })
                    .select('id').single();
                if (en) throw en;
                fknegozio = nn.id;
                negozi.push({ id: fknegozio, nome: nomeNegozio });
            }

            const prezzounita = calcolaPrezzoPer(prezzo, quantita, unita);
            const unitaLabel = UNITA_BASE[unita] || unita;
            const payload = { fkprodotto, fknegozio, variante, prezzo, quantita, unita, prezzounita, promozione, note };

            // 3. Controlla se esiste già una rilevazione per questa combinazione
            let q = supabaseClient
                .from('prezzi')
                .select('id, prezzo, quantita, unita, datarilevazione')
                .eq('fkprodotto', fkprodotto)
                .eq('fknegozio', fknegozio)
                .limit(1);

            if (variante) q = q.eq('variante', variante);
            else q = q.is('variante', null);

            const { data: risultati, error: echeck } = await q;
            if (echeck) throw echeck;
            const esistente = risultati?.[0] ?? null;

            if (esistente) {
                // Mostra pannello di conferma con confronto prezzi
                const vecchioLabel = `€${parseFloat(esistente.prezzo).toFixed(2)} × ${esistente.quantita}${esistente.unita} — rilevato il ${esistente.datarilevazione}`;
                const nuovoLabel = `€${prezzo.toFixed(2)} × ${quantita}${unita} (€${prezzounita.toFixed(2)}/${unitaLabel})`;

                msgWarn.innerHTML = `
                    <div class="warn-title">⚠️ Rilevazione già esistente</div>
                    <div class="warn-detail">
                        <div>Precedente: <span>${vecchioLabel}</span></div>
                        <div>Nuovo:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span>${nuovoLabel}</span></div>
                    </div>
                    <div class="warn-actions">
                        <button class="btn btn-primary" id="btnConfermaAggiorna">Aggiorna</button>
                        <button class="btn btn-ghost"   id="btnConfermaAnnulla">Annulla</button>
                    </div>
                `;
                msgWarn.classList.add('visible');

                document.getElementById('btnConfermaAggiorna').addEventListener('click', async () => {
                    msgWarn.classList.remove('visible');
                    try {
                        const { error: eupd } = await supabaseClient
                            .from('prezzi')
                            .update({ ...payload, datarilevazione: new Date().toISOString().slice(0, 10) })
                            .eq('id', esistente.id);
                        if (eupd) throw eupd;
                        msgOk.textContent = `✅ Aggiornato! ${nomeProdotto} @ ${nomeNegozio} — €${prezzo.toFixed(2)} (€${prezzounita.toFixed(2)}/${unitaLabel})`;
                        msgOk.classList.add('visible');
                        resetForm();
                    } catch (err) {
                        console.error(err);
                        msgErr.textContent = "Errore durante l'aggiornamento. Riprova.";
                        msgErr.classList.add('visible');
                    }
                });

                document.getElementById('btnConfermaAnnulla').addEventListener('click', () => {
                    msgWarn.classList.remove('visible');
                });

            } else {
                // Nessun duplicato — inserimento normale
                const { error: eins } = await supabaseClient.from('prezzi').insert(payload);
                if (eins) throw eins;
                msgOk.textContent = `✅ Salvato! ${nomeProdotto} @ ${nomeNegozio} — €${prezzo.toFixed(2)} (€${prezzounita.toFixed(2)}/${unitaLabel})`;
                msgOk.classList.add('visible');
                resetForm();
            }

        } catch (err) {
            console.error(err);
            msgErr.textContent = 'Errore durante il salvataggio. Riprova.';
            msgErr.classList.add('visible');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Salva rilevazione';
        }
    });
}
