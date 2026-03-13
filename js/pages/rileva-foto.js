// ============================================================
// RILEVA-FOTO.JS — scatta o carica una foto, Gemini estrae i dati
// ============================================================

function renderRilevaFoto() {
    document.getElementById('app').innerHTML = `
        <div class="page-header">
            <h1>Rileva da foto</h1>
            <p>Scatta o carica una foto al cartellino del prezzo.</p>
        </div>

        <div class="card">

            <!-- ZONA UPLOAD -->
            <div class="foto-drop-area" id="dropArea">
                <div class="foto-drop-icon">📷</div>
                <div class="foto-drop-testo">
                    <strong>Trascina una foto qui</strong>
                    <span>oppure</span>
                </div>
                <div class="foto-drop-btns">
                    <label class="btn btn-primary" for="inputFoto">Scegli dalla galleria</label>
                    <label class="btn btn-ghost"   for="inputFotoCamera">Scatta una foto</label>
                </div>
                <input type="file" id="inputFoto"       accept="image/*"                     style="display:none" />
                <input type="file" id="inputFotoCamera" accept="image/*" capture="environment" style="display:none" />
            </div>

            <!-- ANTEPRIMA FOTO -->
            <div class="foto-preview-wrap" id="previewWrap" style="display:none">
                <img id="previewImg" class="foto-preview" alt="Anteprima" />
                <button class="btn btn-ghost btn-sm" id="btnCambia">✕ Cambia foto</button>
            </div>

            <div class="divider" id="dividerAnalizza" style="display:none"></div>

            <!-- PULSANTE ANALIZZA -->
            <div id="areaAnalizza" style="display:none">
                <button class="btn btn-primary" id="btnAnalizza">🔍 Analizza con Gemini</button>
            </div>

            <!-- LOADING -->
            <div class="foto-loading" id="loadingGemini" style="display:none">
                <div class="spinner"></div>
                <span>Gemini sta analizzando la foto…</span>
            </div>

            <!-- RISULTATI -->
            <div id="risultatiWrap" style="display:none">
                <div class="divider"></div>
                <h3 style="margin-bottom:1rem">Dati estratti</h3>
                <div id="risultatiPreview" class="risultati-grid"></div>
                <div class="msg msg-warning" id="msgAvviso" style="margin-top:.75rem; display:none"></div>
                <div class="form-actions" style="margin-top:1.25rem">
                    <button class="btn btn-primary" id="btnUsaDati">Vai al form →</button>
                    <button class="btn btn-ghost"   id="btnRiprova">Riprova</button>
                </div>
            </div>

            <div class="msg msg-error" id="msgErrore"></div>

        </div>
    `;

    initRilevaFoto();
}

function initRilevaFoto() {
    let fileSelezionato = null;
    let datiEstratti    = null;

    const dropArea      = document.getElementById('dropArea');
    const previewWrap   = document.getElementById('previewWrap');
    const previewImg    = document.getElementById('previewImg');
    const areaAnalizza  = document.getElementById('areaAnalizza');
    const dividerAn     = document.getElementById('dividerAnalizza');
    const loadingGemini = document.getElementById('loadingGemini');
    const risultatiWrap = document.getElementById('risultatiWrap');
    const msgErrore     = document.getElementById('msgErrore');

    // ---- Selezione file ----
    function gestisciFoto(file) {
        if (!file || !file.type.startsWith('image/')) {
            mostraErrore("Il file selezionato non è un'immagine valida.");
            return;
        }
        fileSelezionato = file;
        previewImg.src = URL.createObjectURL(file);
        dropArea.style.display      = 'none';
        previewWrap.style.display   = 'flex';
        areaAnalizza.style.display  = 'block';
        dividerAn.style.display     = 'block';
        risultatiWrap.style.display = 'none';
        msgErrore.classList.remove('visible');
        datiEstratti = null;
    }

    document.getElementById('inputFoto').addEventListener('change',       e => gestisciFoto(e.target.files[0]));
    document.getElementById('inputFotoCamera').addEventListener('change', e => gestisciFoto(e.target.files[0]));

    // Drag & drop
    dropArea.addEventListener('dragover',  e => { e.preventDefault(); dropArea.classList.add('drag-over'); });
    dropArea.addEventListener('dragleave', ()  => dropArea.classList.remove('drag-over'));
    dropArea.addEventListener('drop', e => {
        e.preventDefault();
        dropArea.classList.remove('drag-over');
        gestisciFoto(e.dataTransfer.files[0]);
    });

    // Cambia foto
    document.getElementById('btnCambia').addEventListener('click', () => {
        fileSelezionato = null;
        datiEstratti    = null;
        previewWrap.style.display   = 'none';
        areaAnalizza.style.display  = 'none';
        dividerAn.style.display     = 'none';
        risultatiWrap.style.display = 'none';
        dropArea.style.display      = 'flex';
        msgErrore.classList.remove('visible');
        document.getElementById('inputFoto').value        = '';
        document.getElementById('inputFotoCamera').value  = '';
    });

    // ---- Analizza ----
    document.getElementById('btnAnalizza').addEventListener('click', async () => {
        if (!fileSelezionato) return;
        msgErrore.classList.remove('visible');
        areaAnalizza.style.display  = 'none';
        loadingGemini.style.display = 'flex';

        try {
            datiEstratti = await analizzaConGemini(fileSelezionato);
            mostraRisultati(datiEstratti);
        } catch (err) {
            console.error(err);
            mostraErrore("Errore durante l'analisi. Riprova o inserisci i dati manualmente.");
            areaAnalizza.style.display = 'block';
        } finally {
            loadingGemini.style.display = 'none';
        }
    });

    // ---- Vai al form ----
    document.getElementById('btnUsaDati').addEventListener('click', () => {
        if (datiEstratti) navigate('rileva-manuale', { ...datiEstratti, daFoto: true });
    });

    document.getElementById('btnRiprova').addEventListener('click', () => {
        risultatiWrap.style.display = 'none';
        areaAnalizza.style.display  = 'block';
    });

    // ---- Helpers ----
    function mostraErrore(testo) {
        msgErrore.textContent = testo;
        msgErrore.classList.add('visible');
    }

    function mostraRisultati(dati) {
        const campi = [
            { label: 'Prodotto',   val: dati.nomeProdotto },
            { label: 'Negozio',    val: dati.nomeNegozio  },
            { label: 'Variante',   val: dati.variante      },
            { label: 'Prezzo',     val: dati.prezzo    != null ? `€ ${parseFloat(dati.prezzo).toFixed(2)}` : null },
            { label: 'Quantità',   val: dati.quantita  != null ? `${dati.quantita} ${dati.unita || ''}`    : null },
            { label: 'Promozione', val: dati.promozione ? '🏷️ Sì' : null },
            { label: 'Note',       val: dati.note },
        ].filter(c => c.val);

        document.getElementById('risultatiPreview').innerHTML = campi.map(c => `
            <div class="risultato-campo">
                <div class="risultato-label">${c.label}</div>
                <div class="risultato-val">${c.val}</div>
            </div>
        `).join('');

        const mancanti = [];
        if (!dati.nomeProdotto)   mancanti.push('prodotto');
        if (dati.prezzo == null)  mancanti.push('prezzo');
        if (dati.quantita == null) mancanti.push('quantità');
        if (!dati.unita)          mancanti.push('unità di misura');

        const msgAvviso = document.getElementById('msgAvviso');
        if (mancanti.length) {
            msgAvviso.textContent  = `⚠️ Non ho trovato: ${mancanti.join(', ')}. Potrai completarli nel form.`;
            msgAvviso.style.display = 'block';
        } else {
            msgAvviso.style.display = 'none';
        }

        risultatiWrap.style.display = 'block';
    }
}

// ---- Chiamata Gemini Vision ----
async function analizzaConGemini(file) {
    const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const prompt = `Analizza questa immagine di un cartellino del prezzo al supermercato.
Estrai tutte le informazioni visibili e rispondi SOLO con un oggetto JSON valido.
Non aggiungere testo, spiegazioni, backtick o markdown. Solo il JSON grezzo.

Struttura richiesta (usa null per i campi non trovati):
{
  "nomeProdotto": "nome del prodotto in minuscolo italiano",
  "nomeNegozio": "nome del negozio se visibile, altrimenti null",
  "variante": "variante se presente (es. sgusciati, cotti, biologico), altrimenti null",
  "prezzo": numero decimale con punto (es. 3.50), null se non trovato,
  "quantita": numero (es. 500), null se non trovato,
  "unita": una tra: g, kg, mg, ml, cl, dl, l, pz — null se non trovato,
  "promozione": true se è offerta/promo, false altrimenti,
  "note": "marca o altre info utili", null se non rilevante
}`;

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: file.type, data: base64 } }
                    ]
                }],
                generationConfig: { temperature: 0.1 }
            })
        }
    );

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || 'Errore API Gemini');
    }

    const json  = await res.json();
    const testo = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!testo) throw new Error('Risposta Gemini vuota');

    return JSON.parse(testo.replace(/```json|```/g, '').trim());
}
