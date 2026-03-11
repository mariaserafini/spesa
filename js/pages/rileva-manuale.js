// ============================================================
// RILEVA-MANUALE.JS — form inserimento manuale
// ============================================================

async function renderRilevaManuale() {
    document.getElementById('app').innerHTML = `
        <div class="page-header">
            <h1>Rileva manuale</h1>
            <p>Inserisci i dati del prodotto che hai trovato in negozio.</p>
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
                <input type="text" id="inputVariante" placeholder="es. sgusciati, sott'olio, cotti…" />
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
        </div>
    `;

    // Inizializza la logica dopo aver iniettato l'HTML
    await initRilevaManuale();
}

async function initRilevaManuale() {
    // ---- Stato ----
    let prodotti = [];
    let negozi   = [];
    let prodottoSelezionato = null;
    let negozioSelezionato  = null;
    let prodottoNuovo = false;
    let negozioNuovo  = false;

    // ---- Carica dati dal db ----
    const [resProdotti, resNegozi] = await Promise.all([
        supabaseClient.from('prodotti').select('id, nome, categoria, unita').order('nome'),
        supabaseClient.from('negozi').select('id, nome, filiale').order('nome'),
    ]);

    // DEBUG — rimuovi quando tutto funziona
    console.log('📦 PRODOTTI:', resProdotti.data, '| errore:', resProdotti.error);
    console.log('🏪 NEGOZI:',   resNegozi.data,   '| errore:', resNegozi.error);

    prodotti = resProdotti.data || [];
    negozi   = resNegozi.data   || [];

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
        input:    document.getElementById('inputProdotto'),
        dropdown: document.getElementById('dropdownProdotto'),
        lista:    prodotti,
        onSelect: (v) => { prodottoSelezionato = v; prodottoNuovo = false; impostaNuovoProdotto(false); },
        onNuovo:  (t) => { prodottoSelezionato = null; prodottoNuovo = !!t; impostaNuovoProdotto(!!t); }
    });

    creaAutocomplete({
        input:    document.getElementById('inputNegozio'),
        dropdown: document.getElementById('dropdownNegozio'),
        lista:    negozi,
        onSelect: (v) => { negozioSelezionato = v; negozioNuovo = false; impostaNuovoNegozio(false); },
        onNuovo:  (t) => { negozioSelezionato = null; negozioNuovo = !!t; impostaNuovoNegozio(!!t); }
    });

    // ---- Calcolo prezzo per unità in tempo reale ----
    function aggiornaCalcolo() {
        const prezzo   = parseFloat(document.getElementById('inputPrezzo').value);
        const quantita = parseFloat(document.getElementById('inputQuantita').value);
        const unita    = document.getElementById('inputUnita').value;
        const box      = document.getElementById('prezzoCalcolato');
        const val      = document.getElementById('valoreCalcolato');

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
        document.getElementById(id).addEventListener('input',  aggiornaCalcolo);
        document.getElementById(id).addEventListener('change', aggiornaCalcolo);
    });

    // ---- Reset ----
    function resetForm() {
        ['inputProdotto','inputNegozio','inputVariante','inputPrezzo','inputQuantita','inputNote']
            .forEach(id => { document.getElementById(id).value = ''; });
        document.getElementById('inputUnita').value = '';
        document.getElementById('inputPromozione').checked = false;
        prodottoSelezionato = null;
        negozioSelezionato  = null;
        prodottoNuovo = false;
        negozioNuovo  = false;
        impostaNuovoProdotto(false);
        impostaNuovoNegozio(false);
        document.getElementById('prezzoCalcolato').classList.remove('visibile');
    }

    document.getElementById('btnReset').addEventListener('click', () => {
        resetForm();
        document.getElementById('msgErrore').classList.remove('visible');
        document.getElementById('msgSuccesso').classList.remove('visible');
    });

    // ---- Salvataggio ----
    document.getElementById('btnSalva').addEventListener('click', async () => {
        const msgErr = document.getElementById('msgErrore');
        const msgOk  = document.getElementById('msgSuccesso');
        msgErr.classList.remove('visible');
        msgOk.classList.remove('visible');

        const nomeProdotto = document.getElementById('inputProdotto').value.trim();
        const nomeNegozio  = document.getElementById('inputNegozio').value.trim();
        const variante     = document.getElementById('inputVariante').value.trim() || null;
        const prezzo       = parseFloat(document.getElementById('inputPrezzo').value);
        const quantita     = parseFloat(document.getElementById('inputQuantita').value);
        const unita        = document.getElementById('inputUnita').value;
        const promozione   = document.getElementById('inputPromozione').checked;
        const note         = document.getElementById('inputNote').value.trim() || null;

        const errori = [];
        if (!nomeProdotto)                    errori.push('Inserisci il nome del prodotto.');
        if (!nomeNegozio)                     errori.push('Inserisci il nome del negozio.');
        if (isNaN(prezzo) || prezzo <= 0)     errori.push('Inserisci un prezzo valido.');
        if (isNaN(quantita) || quantita <= 0) errori.push('Inserisci una quantità valida.');
        if (!unita)                           errori.push("Seleziona l'unità di misura.");
        if (prodottoNuovo) {
            if (!document.getElementById('nuovaCategoria').value) errori.push('Seleziona la categoria del nuovo prodotto.');
            if (!document.getElementById('nuovaUnita').value)     errori.push("Seleziona l'unità di confronto del nuovo prodotto.");
        }

        if (errori.length) {
            msgErr.innerHTML = errori.join('<br>');
            msgErr.classList.add('visible');
            return;
        }

        const btn = document.getElementById('btnSalva');
        btn.disabled = true;
        btn.textContent = 'Salvataggio…';

        try {
            // 1. Prodotto
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

            // 2. Negozio
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

            // 3. Prezzo
            const prezzounita = calcolaPrezzoPer(prezzo, quantita, unita);
            const { error: eprezzi } = await supabaseClient
                .from('prezzi')
                .insert({ fkprodotto, fknegozio, variante, prezzo, quantita, unita, prezzounita, promozione, note });
            if (eprezzi) throw eprezzi;

            msgOk.textContent = `✅ Salvato! ${nomeProdotto} @ ${nomeNegozio} — €${prezzo.toFixed(2)} (€${prezzounita.toFixed(2)}/${UNITA_BASE[unita] || unita})`;
            msgOk.classList.add('visible');
            resetForm();

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
