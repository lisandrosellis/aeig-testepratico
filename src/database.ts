import Database from 'better-sqlite3';

export const db = new Database(process.env.DB_FILE ?? 'aeig.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS associados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL UNIQUE,
    mensalidade_centavos INTEGER NOT NULL CHECK (mensalidade_centavos > 0),
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cobrancas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    associado_id INTEGER NOT NULL REFERENCES associados(id),
    mes_referencia TEXT NOT NULL,
    valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
    nosso_numero TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('PENDENTE', 'PAGA')),
    data_pagamento TEXT,
    criada_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (associado_id, mes_referencia)
  );

  CREATE TABLE IF NOT EXISTS eventos_webhook (
    id_evento TEXT PRIMARY KEY,
    nosso_numero TEXT NOT NULL,
    recebido_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);
