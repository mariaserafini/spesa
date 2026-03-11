-- ============================================================
-- PRICE TRACKER — Creazione tabelle
-- ============================================================

-- ------------------------------------------------------------
-- NEGOZI
-- ------------------------------------------------------------
CREATE TABLE negozi (
    id            SERIAL PRIMARY KEY,
    nome          TEXT NOT NULL,
    filiale       TEXT,
    datacreazione TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------
-- PRODOTTI
-- ------------------------------------------------------------
CREATE TABLE prodotti (
    id            SERIAL PRIMARY KEY,
    nome          TEXT NOT NULL,
    categoria     TEXT,
    unita         TEXT NOT NULL,  -- unità di riferimento per il confronto: 'kg', 'l', 'pz'
    datacreazione TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------
-- PREZZI
-- ------------------------------------------------------------
CREATE TABLE prezzi (
    id              SERIAL PRIMARY KEY,
    fkprodotto      INTEGER NOT NULL REFERENCES prodotti(id) ON DELETE CASCADE,
    fknegozio       INTEGER NOT NULL REFERENCES negozi(id)   ON DELETE CASCADE,
    variante        TEXT,
    prezzo          NUMERIC(10, 2) NOT NULL,
    quantita        NUMERIC(10, 3) NOT NULL,
    unita           TEXT NOT NULL,
    prezzounita     NUMERIC(10, 4) NOT NULL,
    promozione      BOOLEAN DEFAULT FALSE,
    datarilevazione DATE NOT NULL DEFAULT CURRENT_DATE,
    note            TEXT,
    datacreazione   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------
-- INDICI
-- ------------------------------------------------------------
CREATE INDEX idx_prodotti_nome ON prodotti USING GIN (to_tsvector('italian', nome));
CREATE INDEX idx_prezzi_prodotto ON prezzi(fkprodotto);
CREATE INDEX idx_prezzi_negozio  ON prezzi(fknegozio);
CREATE INDEX idx_prezzi_data     ON prezzi(datarilevazione DESC);

-- ------------------------------------------------------------
-- RLS — lettura e scrittura solo per utenti autenticati
-- ------------------------------------------------------------
ALTER TABLE negozi   ENABLE ROW LEVEL SECURITY;
ALTER TABLE prodotti ENABLE ROW LEVEL SECURITY;
ALTER TABLE prezzi   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON negozi   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON prodotti FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON prezzi   FOR ALL TO authenticated USING (true) WITH CHECK (true);
