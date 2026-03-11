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
    datacreazione     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ------------------------------------------------------------
-- PRODOTTI
-- ------------------------------------------------------------
CREATE TABLE prodotti (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome          TEXT NOT NULL,
    categoria     TEXT,
    unita TEXT NOT NULL,  -- es. 'kg', 'l', 'pz' (unità di riferimento per il confronto)
    datacreazione     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ------------------------------------------------------------
-- PREZZI
-- ------------------------------------------------------------
CREATE TABLE prezzi (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fkprodotto      UUID NOT NULL REFERENCES prodotti(id) ON DELETE CASCADE,
    fknegozio      UUID NOT NULL REFERENCES negozi(id) ON DELETE CASCADE,
    variante         TEXT,                    -- es. 'intere', 'tritate', 'sott'olio'
    prezzo           NUMERIC(10, 2) NOT NULL, -- prezzo pagato
    quantita         NUMERIC(10, 3) NOT NULL, -- quantità del formato (es. 500)
    unita            TEXT NOT NULL,           -- unità del formato (es. 'g', 'kg', 'l')
    prezzounita NUMERIC(10, 4) NOT NULL, -- prezzo normalizzato (es. €/kg) calcolato all'inserimento
    promozione    BOOLEAN DEFAULT FALSE,
    datarilevazione    DATE NOT NULL DEFAULT CURRENT_DATE,
    note             TEXT,
    datacreazione     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ------------------------------------------------------------
-- INDICI - per velocizzare le ricerche più comuni
-- ------------------------------------------------------------

-- Ricerca prodotti per nome (supporta ILIKE '%noci%')
CREATE INDEX idx_prodotti_nome ON prodotti USING GIN (to_tsvector('italian', nome));

-- Filtro prezzi per prodotto
CREATE INDEX idx_prezzi_prodotto ON prezzi(fkprodotto);

-- Filtro prezzi per negozio
CREATE INDEX idx_prezzi_negozio ON prezzi(fknegozio);

-- Ordinamento per data
CREATE INDEX idx_prezzi_data ON prezzi(datarilevazione DESC);
