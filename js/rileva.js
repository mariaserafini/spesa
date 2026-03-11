// ============================================================
// RILEVA.JS — utility condivise tra rileva-manuale e rileva-foto
// ============================================================

// ---- Conversione unità → unità base ----
const CONVERSIONI = {
    g: { base: 'kg', fattore: 0.001 },
    kg: { base: 'kg', fattore: 1 },
    mg: { base: 'kg', fattore: 0.000001 },
    ml: { base: 'l', fattore: 0.001 },
    cl: { base: 'l', fattore: 0.01 },
    dl: { base: 'l', fattore: 0.1 },
    l: { base: 'l', fattore: 1 },
    pz: { base: 'pz', fattore: 1 },
};

const UNITA_BASE = { g: 'kg', kg: 'kg', mg: 'kg', ml: 'l', cl: 'l', dl: 'l', l: 'l', pz: 'pz' };

function calcolaPrezzoPer(prezzo, quantita, unita) {
    const conv = CONVERSIONI[unita];
    if (!conv) return null;
    const quantitaBase = quantita * conv.fattore;
    if (quantitaBase === 0) return null;
    return +(prezzo / quantitaBase).toFixed(4);
}

// ---- Autocomplete generico ----
function creaAutocomplete({ input, dropdown, lista, onSelect, onNuovo }) {
    let selezioneIdx = -1;

    function aggiorna(query) {
        const q = query.trim().toLowerCase();
        dropdown.innerHTML = '';
        selezioneIdx = -1;
        if (!q) { chiudi(); return; }

        const filtrate = lista.filter(v => v.nome.toLowerCase().includes(q));

        if (filtrate.length === 0) {
            const item = document.createElement('div');
            item.className = 'ac-item ac-item-nuovo';
            item.textContent = `➕ Aggiungi "${query}"`;
            item.addEventListener('mousedown', () => {
                input.value = query;
                if (onNuovo) onNuovo(query);
                chiudi();
            });
            dropdown.appendChild(item);
        } else {
            filtrate.slice(0, 8).forEach(v => {
                const item = document.createElement('div');
                item.className = 'ac-item';
                const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                item.innerHTML = v.nome.replace(regex, '<strong>$1</strong>');
                item.addEventListener('mousedown', () => {
                    input.value = v.nome;
                    if (onSelect) onSelect(v);
                    chiudi();
                });
                dropdown.appendChild(item);
            });
        }
        dropdown.style.display = 'block';
    }

    function chiudi() {
        dropdown.style.display = 'none';
        selezioneIdx = -1;
    }

    function naviga(dir) {
        const items = dropdown.querySelectorAll('.ac-item');
        if (!items.length) return;
        selezioneIdx = Math.max(-1, Math.min(items.length - 1, selezioneIdx + dir));
        items.forEach((el, i) => el.classList.toggle('ac-active', i === selezioneIdx));
    }

    input.addEventListener('input', () => {
        if (onNuovo) onNuovo(null); // reset stato nuovo ad ogni modifica
        aggiorna(input.value);
    });

    input.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); naviga(1); }
        if (e.key === 'ArrowUp') { e.preventDefault(); naviga(-1); }
        if (e.key === 'Enter') {
            const items = dropdown.querySelectorAll('.ac-item');
            if (selezioneIdx >= 0 && items[selezioneIdx]) {
                items[selezioneIdx].dispatchEvent(new Event('mousedown'));
            }
            chiudi();
        }
        if (e.key === 'Escape') chiudi();
    });

    input.addEventListener('blur', () => setTimeout(chiudi, 150));
    input.addEventListener('focus', () => { if (input.value) aggiorna(input.value); });
}
