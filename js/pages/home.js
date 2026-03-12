// ============================================================
// HOME.JS — Dashboard Rilevazioni Vecchie e Statistiche Negozi
// ============================================================

async function renderHome() {
    const contenitore = document.getElementById('app');

    // Stato iniziale di caricamento
    contenitore.innerHTML = `
        <div class="foto-loading" style="display:flex; justify-content: center; margin-top: 2rem;">
            <div class="spinner"></div>
            <span>Caricamento dashboard...</span>
        </div>
    `;

    try {
        const oggi = new Date();
        const seiMesiFa = new Date();
        seiMesiFa.setMonth(seiMesiFa.getMonth() - 6);
        const unAnnoFa = new Date();
        unAnnoFa.setFullYear(unAnnoFa.getFullYear() - 1);

        const data6m = seiMesiFa.toISOString().slice(0, 10);
        const data12m = unAnnoFa.toISOString().slice(0, 10);

        // 1. Recupero le 4 rilevazioni più vecchie in assoluto
        const { data: vecchie, error: errV } = await supabaseClient
            .from('prezzi')
            .select('*, prodotti(nome, unita), negozi(nome, filiale)')
            .order('datarilevazione', { ascending: true })
            .limit(4);

        if (errV) throw errV;

        // 2. Recupero tutte le rilevazioni antecedenti a 6 mesi per calcolare i negozi
        const { data: tutteVecchie, error: errT } = await supabaseClient
            .from('prezzi')
            .select('fknegozio, datarilevazione, negozi(nome, filiale)')
            .lt('datarilevazione', data6m);

        if (errT) throw errT;

        // Elaborazione statistiche negozi
        const statsNegozi = {};
        tutteVecchie.forEach(r => {
            const id = r.fknegozio;
            if (!statsNegozi[id]) {
                statsNegozi[id] = {
                    nome: r.negozi.filiale ? `${r.negozi.nome} (${r.negozi.filiale})` : r.negozi.nome,
                    vecchie: 0,      // > 1 anno
                    menoRecenti: 0   // 6-12 mesi
                };
            }
            if (r.datarilevazione < data12m) {
                statsNegozi[id].vecchie++;
            } else {
                statsNegozi[id].menoRecenti++;
            }
        });

        // Ordino i negozi per numero totale di rilevazioni non aggiornate e prendo i primi 4
        const topNegozi = Object.values(statsNegozi)
            .sort((a, b) => (b.vecchie + b.menoRecenti) - (a.vecchie + a.menoRecenti))
            .slice(0, 4);

        // Rendering finale
        contenitore.innerHTML = `
            <div class="page-header">
                <h1>Da controllare</h1>
                <p>Panoramica dei dati che necessitano di un aggiornamento.</p>
            </div>

            <div class="controlla-sezione card" style="margin-bottom: 2rem;">
                <div class="controlla-variante-titolo">
                    ⏳ Le 4 rilevazioni più vecchie
                </div>
                <div class="table-responsive">
                    <table class="results-table">
                        <thead>
                            <tr>
                                <th>Prodotto / Negozio</th>
                                <th>Prezzo</th>
                                <th style="text-align:right">Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${vecchie.map(r => `
                                <tr>
                                    <td>
                                        <div class="controlla-negozio">${r.prodotti.nome}</div>
                                        <div class="controlla-note">${r.negozi.nome} ${r.negozi.filiale ? '(' + r.negozi.filiale + ')' : ''}</div>
                                    </td>
                                    <td>
                                        <div class="controlla-prezzo-unita">€ ${parseFloat(r.prezzounita).toFixed(2)}</div>
                                        <div class="controlla-prezzo-formato">${r.quantita}${r.unita}</div>
                                    </td>
                                    <td style="text-align:right">
                                        <span class="badge badge-vecchio">${calcolaEtaTesto(r.datarilevazione).testo}</span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="controlla-sezione card">
                <div class="controlla-variante-titolo controlla-variante-base">
                    🏢 Negozi meno aggiornati
                </div>
                <div class="table-responsive">
                    <table class="results-table">
                        <thead>
                            <tr>
                                <th>Negozio</th>
                                <th style="text-align:center">> 1 Anno</th>
                                <th style="text-align:center">6-12 Mesi</th>
                                <th style="text-align:right">Totale</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topNegozi.length > 0 ? topNegozi.map(n => `
                                <tr>
                                    <td><div class="controlla-negozio">${n.nome}</div></td>
                                    <td style="text-align:center"><span class="badge badge-vecchio">${n.vecchie}</span></td>
                                    <td style="text-align:center"><span class="badge badge-inattendibile">${n.menoRecenti}</span></td>
                                    <td style="text-align:right; font-weight:700">${n.vecchie + n.menoRecenti}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="4" class="text-muted">Nessun dato da segnalare</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="form-actions mt-3">
                <button class="btn btn-primary" onclick="navigate('controlla')">🔍 Vai a Controlla</button>
                <button class="btn btn-ghost" onclick="navigate('analizza')">📊 Vai ad Analizza</button>
            </div>
        `;

    } catch (error) {
        console.error(error);
        contenitore.innerHTML = `<div class="msg msg-error visible">Errore nel caricamento della dashboard.</div>`;
    }
}