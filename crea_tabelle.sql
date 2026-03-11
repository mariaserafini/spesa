-- ============================================================
-- PRICE TRACKER - Creazione tabelle
-- ============================================================


-- ------------------------------------------------------------
-- NEGOZI
-- ------------------------------------------------------------
CREATE TABLE negozi (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome          TEXT NOT NULL,
    filiale       TEXT,
    creato_il     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ------------------------------------------------------------
-- PRODOTTI
-- ------------------------------------------------------------
CREATE TABLE prodotti (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome          TEXT NOT NULL,
    categoria     TEXT,
    unita_default TEXT NOT NULL,  -- es. 'kg', 'l', 'pz' (unità di riferimento per il confronto)
    creato_il     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ------------------------------------------------------------
-- PREZZI
-- ------------------------------------------------------------
CREATE TABLE prezzi (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prodotto_id      UUID NOT NULL REFERENCES prodotti(id) ON DELETE CASCADE,
    negozio_id       UUID NOT NULL REFERENCES negozi(id) ON DELETE CASCADE,
    variante         TEXT,                    -- es. 'intere', 'tritate', 'sott'olio'
    prezzo           NUMERIC(10, 2) NOT NULL, -- prezzo pagato
    quantita         NUMERIC(10, 3) NOT NULL, -- quantità del formato (es. 500)
    unita            TEXT NOT NULL,           -- unità del formato (es. 'g', 'kg', 'l')
    prezzo_per_unita NUMERIC(10, 4) NOT NULL, -- prezzo normalizzato (es. €/kg) calcolato all'inserimento
    in_promozione    BOOLEAN DEFAULT FALSE,
    acquistato_il    DATE NOT NULL DEFAULT CURRENT_DATE,
    note             TEXT,
    creato_il        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ------------------------------------------------------------
-- INDICI - per velocizzare le ricerche più comuni
-- ------------------------------------------------------------

-- Ricerca prodotti per nome (supporta ILIKE '%noci%')
CREATE INDEX idx_prodotti_nome ON prodotti USING GIN (to_tsvector('italian', nome));

-- Filtro prezzi per prodotto
CREATE INDEX idx_prezzi_prodotto ON prezzi(prodotto_id);

-- Filtro prezzi per negozio
CREATE INDEX idx_prezzi_negozio ON prezzi(negozio_id);

-- Ordinamento per data
CREATE INDEX idx_prezzi_data ON prezzi(acquistato_il DESC);


-- ------------------------------------------------------------
-- ESEMPIO DI QUERY - trovare il prezzo migliore per un prodotto
-- ------------------------------------------------------------

-- SELECT
--     n.nome           AS negozio,
--     n.filiale,
--     p.variante,
--     p.prezzo,
--     p.quantita,
--     p.unita,
--     p.prezzo_per_unita,
--     p.in_promozione,
--     p.acquistato_il
-- FROM prezzi p
-- JOIN negozi n    ON n.id = p.negozio_id
-- JOIN prodotti pr ON pr.id = p.prodotto_id
-- WHERE pr.nome ILIKE '%noci%'
-- ORDER BY p.prezzo_per_unita ASC;
