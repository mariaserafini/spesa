-- ============================================================
-- PRICE TRACKER — Import dati iniziali
-- ============================================================

-- ------------------------------------------------------------
-- NEGOZI
-- id 1 = Koro
-- id 2 = Lidl
-- ------------------------------------------------------------
INSERT INTO negozi (id, nome) VALUES (1, 'Koro');
INSERT INTO negozi (id, nome) VALUES (2, 'Lidl');

-- ------------------------------------------------------------
-- PRODOTTI
-- Frutta secca: 1–14
-- Legumi:       15–16
-- Cereali:      17–26
-- Semi:         27–32
-- Condimenti:   33–38
-- Verdure:      39
-- Altro:        40
-- ------------------------------------------------------------

-- Frutta secca
INSERT INTO prodotti (id, nome, categoria, unita) VALUES ( 1, 'albicocche secche',      'Frutta secca', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES ( 2, 'anacardi',                'Frutta secca', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES ( 3, 'bacche goji',             'Frutta secca', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES ( 4, 'cocco',                   'Frutta secca', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES ( 5, 'cranberries',             'Frutta secca', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES ( 6, 'datteri',                 'Frutta secca', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES ( 7, 'mandorle',                'Frutta secca', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES ( 8, 'nocciole',                'Frutta secca', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES ( 9, 'noci',                    'Frutta secca', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (10, 'noci brasiliane',         'Frutta secca', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (11, 'noci pecan',              'Frutta secca', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (12, 'pistacchi',               'Frutta secca', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (13, 'prugne secche',           'Frutta secca', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (14, 'uvetta',                  'Frutta secca', 'kg');

-- Legumi
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (15, 'ceci',                   'Legumi', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (16, 'farina di ceci',         'Farine', 'kg');

-- Cereali — prodotti base
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (17, 'cous cous',              'Cereali', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (18, 'farro',                  'Cereali', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (19, 'fiocchi di avena',       'Cereali', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (20, 'grano saraceno',         'Cereali', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (21, 'granola',                'Cereali', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (22, 'quinoa',                 'Cereali', 'kg');
-- Cereali — prodotti distinti (non varianti)
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (23, 'farro soffiato',         'Cereali', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (24, 'grano saraceno fiocchi', 'Cereali', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (25, 'grano saraceno soffiato','Cereali', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (26, 'quinoa soffiata',        'Cereali', 'kg');

-- Semi
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (27, 'semi di canapa',         'Semi', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (28, 'semi di chia',           'Semi', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (29, 'semi di girasole',       'Semi', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (30, 'semi di lino',           'Semi', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (31, 'semi di sesamo',         'Semi', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (32, 'semi di zucca',          'Semi', 'kg');

-- Condimenti
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (33, 'latte di cocco',         'Condimenti', 'l');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (34, 'lievito alimentare',     'Condimenti', 'kg');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (35, 'olio di cocco',          'Condimenti', 'l');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (36, 'salsa di soia',          'Condimenti', 'l');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (37, 'sciroppo d''acero',      'Condimenti', 'l');
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (38, 'tahina',                 'Condimenti', 'kg');

-- Verdure
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (39, 'pomodori essiccati',     'Verdure', 'kg');

-- Altro
INSERT INTO prodotti (id, nome, categoria, unita) VALUES (40, 'tofu',                   'Legumi', 'kg');

-- ------------------------------------------------------------
-- Allinea le sequenze dopo insert con id esplicito
-- (necessario affinché i prossimi insert generino id 3, 41, ecc.)
-- ------------------------------------------------------------
SELECT setval('negozi_id_seq',   (SELECT MAX(id) FROM negozi));
SELECT setval('prodotti_id_seq', (SELECT MAX(id) FROM prodotti));

-- ------------------------------------------------------------
-- PREZZI (Koro — 2025-11-16)
-- ------------------------------------------------------------
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES ( 1, 1, NULL,         15.00, 1000, 'g',  15.0000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES ( 2, 1, NULL,         13.75, 1000, 'g',  13.7500, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES ( 3, 1, NULL,         22.50, 1000, 'g',  22.5000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (15, 1, 'cotti',       1.50,  240, 'g',   6.2500, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (15, 1, 'secchi',     10.50, 2000, 'g',   5.2500, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES ( 4, 1, 'pezzi',      12.50, 1000, 'g',  12.5000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES ( 4, 1, 'rapè',       10.25, 1000, 'g',  10.2500, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (17, 1, NULL,         14.00, 2000, 'g',   7.0000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES ( 5, 1, NULL,         19.50, 1000, 'g',  19.5000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES ( 6, 1, NULL,         11.50, 1000, 'g',  11.5000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (16, 1, NULL,          7.50, 1000, 'g',   7.5000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (18, 1, NULL,          7.25, 2500, 'g',   2.9000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (23, 1, NULL,          4.50,  400, 'g',  11.2500, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (19, 1, NULL,          5.50, 2500, 'g',   2.2000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (20, 1, NULL,          9.75, 2000, 'g',   4.8800, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (24, 1, NULL,         22.00, 3000, 'g',   7.3300, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (25, 1, NULL,          6.75,  350, 'g',  19.2900, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (21, 1, NULL,          8.50, 1000, 'g',   8.5000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (33, 1, 'latta',       1.75,  400, 'ml',  4.3800, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (34, 1, NULL,         14.50,  500, 'g',  29.0000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES ( 7, 1, NULL,         20.50, 1000, 'g',  20.5000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES ( 8, 1, NULL,         17.50, 1000, 'g',  17.5000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES ( 9, 1, NULL,         11.50, 1000, 'g',  11.5000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (10, 1, NULL,         22.50, 1000, 'g',  22.5000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (11, 1, NULL,         26.50, 1000, 'g',  26.5000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (35, 1, NULL,         13.00, 1000, 'ml', 13.0000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (12, 1, 'sgusciati',  35.75, 1000, 'g',  35.7500, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (39, 1, NULL,         12.50, 1000, 'g',  12.5000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (13, 1, NULL,         15.00, 1000, 'g',  15.0000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (22, 1, NULL,         13.75, 2000, 'g',   6.8800, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (26, 1, NULL,         10.00,  600, 'g',  16.6700, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (36, 1, NULL,          9.75, 1000, 'ml',  9.7500, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (37, 1, NULL,         25.00, 1000, 'ml', 25.0000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (27, 1, NULL,         21.50, 1000, 'g',  21.5000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (28, 1, NULL,         10.75, 1000, 'g',  10.7500, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (29, 1, NULL,         11.50, 2000, 'g',   5.7500, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (30, 1, NULL,         11.25, 2000, 'g',   5.6300, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (31, 1, NULL,          7.75, 1000, 'g',   7.7500, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (32, 1, NULL,         14.50, 1000, 'g',  14.5000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (38, 1, NULL,          7.75,  500, 'g',  15.5000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (40, 1, NULL,          2.60,  200, 'g',  13.0000, FALSE, '2025-11-16');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (14, 1, NULL,          9.50, 1000, 'g',   9.5000, FALSE, '2025-11-16');

-- ------------------------------------------------------------
-- PREZZI (Lidl — 2025-05-08)
-- ------------------------------------------------------------
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES ( 2, 2, NULL,          3.55,  200, 'g',  17.7500, FALSE, '2025-05-08');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (15, 2, 'cotti',       0.53,  250, 'g',   2.1200, FALSE, '2025-05-08');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (15, 2, 'secchi',      1.19,  500, 'g',   2.3800, FALSE, '2025-05-08');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (17, 2, NULL,          1.89, 1000, 'g',   1.8900, FALSE, '2025-05-08');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES ( 5, 2, NULL,          2.05,  200, 'g',  10.2500, FALSE, '2025-05-08');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES ( 6, 2, NULL,          1.09,  250, 'g',   4.3600, FALSE, '2025-05-08');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (16, 2, NULL,          1.90,  500, 'g',   3.8000, FALSE, '2025-05-08');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (18, 2, NULL,          1.29,  500, 'g',   2.5800, FALSE, '2025-05-08');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (19, 2, NULL,          1.05,  500, 'g',   2.1000, FALSE, '2025-05-08');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (21, 2, NULL,          3.05,  750, 'g',   4.0700, FALSE, '2025-05-08');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES ( 8, 2, NULL,          1.90,  100, 'g',  19.0000, FALSE, '2025-05-08');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES ( 9, 2, NULL,          2.69,  200, 'g',  13.4500, FALSE, '2025-05-08');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (10, 2, NULL,          4.09,  200, 'g',  20.4500, FALSE, '2025-05-08');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (11, 2, NULL,          4.20,  200, 'g',  21.0000, FALSE, '2025-05-08');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (36, 2, NULL,          1.09,  150, 'ml',  7.2700, FALSE, '2025-05-08');
INSERT INTO prezzi (fkprodotto, fknegozio, variante,    prezzo, quantita, unita, prezzounita, promozione, datarilevazione) VALUES (40, 2, NULL,          1.39,  180, 'g',   7.7200, FALSE, '2025-05-08');
