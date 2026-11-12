import express, { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from './database';
import { cpfValido, dataISOValida, dinheiroParaCentavos, mesReferenciaValido, somenteDigitos } from './validation';

export const app = express();
app.use(express.json());

function erro(res: Response, status: number, mensagem: string) {
  return res.status(status).json({ erro: mensagem });
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/associados', (req: Request, res: Response) => {
  const { nome, cpf, valor_mensalidade } = req.body ?? {};
  if (typeof nome !== 'string' || !nome.trim()) return erro(res, 400, 'O nome é obrigatório.');
  if (typeof cpf !== 'string' || !cpfValido(cpf)) return erro(res, 400, 'CPF inválido. Informe um CPF com dígitos verificadores válidos.');
  const centavos = dinheiroParaCentavos(valor_mensalidade);
  if (centavos === null || centavos < 1) return erro(res, 400, 'valor_mensalidade deve ser um número maior que zero.');

  try {
    const result = db.prepare('INSERT INTO associados (nome, cpf, mensalidade_centavos) VALUES (?, ?, ?)')
      .run(nome.trim(), somenteDigitos(cpf), centavos);
    return res.status(201).json({
      id: Number(result.lastInsertRowid), nome: nome.trim(), cpf: somenteDigitos(cpf),
      valor_mensalidade: centavos / 100
    });
  } catch (error: any) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') return erro(res, 409, 'Já existe um associado cadastrado com este CPF.');
    return erro(res, 500, 'Não foi possível cadastrar o associado.');
  }
});

app.post('/cobrancas', (req: Request, res: Response) => {
  const { associado_id, mes_referencia } = req.body ?? {};
  if (!Number.isInteger(associado_id) || associado_id <= 0) return erro(res, 400, 'associado_id deve ser um número inteiro positivo.');
  if (!mesReferenciaValido(mes_referencia)) return erro(res, 400, 'mes_referencia deve estar no formato AAAA-MM.');

  const associado = db.prepare('SELECT id, mensalidade_centavos FROM associados WHERE id = ?').get(associado_id) as
    { id: number; mensalidade_centavos: number } | undefined;
  if (!associado) return erro(res, 404, 'Associado não encontrado.');

  const nossoNumero = randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
  try {
    db.prepare(`INSERT INTO cobrancas (associado_id, mes_referencia, valor_centavos, nosso_numero, status)
      VALUES (?, ?, ?, ?, 'PENDENTE')`).run(associado.id, mes_referencia, associado.mensalidade_centavos, nossoNumero);
    return res.status(201).json({ associado_id: associado.id, mes_referencia,
      valor: associado.mensalidade_centavos / 100, nosso_numero: nossoNumero, status: 'PENDENTE' });
  } catch (error: any) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') return erro(res, 409, 'Já existe cobrança para este associado neste mês.');
    return erro(res, 500, 'Não foi possível gerar a cobrança.');
  }
});

app.get('/cobrancas/:nosso_numero', (req: Request, res: Response) => {
  const cobranca = db.prepare(`SELECT c.associado_id, a.nome AS associado, c.mes_referencia,
    c.valor_centavos, c.nosso_numero, c.status, c.data_pagamento
    FROM cobrancas c JOIN associados a ON a.id = c.associado_id WHERE c.nosso_numero = ?`)
    .get(req.params.nosso_numero) as any;
  if (!cobranca) return erro(res, 404, 'Cobrança não encontrada.');
  return res.json({ associado_id: cobranca.associado_id, associado: cobranca.associado,
    mes_referencia: cobranca.mes_referencia, valor: cobranca.valor_centavos / 100,
    nosso_numero: cobranca.nosso_numero, status: cobranca.status, data_pagamento: cobranca.data_pagamento });
});

app.post('/webhooks/pagamento', (req: Request, res: Response) => {
  const { id_evento, nosso_numero, data_pagamento } = req.body ?? {};
  if (typeof id_evento !== 'string' || !id_evento.trim()) return erro(res, 400, 'id_evento é obrigatório.');
  if (typeof nosso_numero !== 'string' || !nosso_numero.trim()) return erro(res, 400, 'nosso_numero é obrigatório.');
  if (!dataISOValida(data_pagamento)) return erro(res, 400, 'data_pagamento deve ser uma data válida no formato AAAA-MM-DD.');

  const jaProcessado = db.prepare('SELECT id_evento FROM eventos_webhook WHERE id_evento = ?').get(id_evento);
  if (jaProcessado) return res.status(200).json({ mensagem: 'Evento já processado anteriormente.', idempotente: true });
  const cobranca = db.prepare('SELECT nosso_numero, status FROM cobrancas WHERE nosso_numero = ?').get(nosso_numero) as
    { nosso_numero: string; status: string } | undefined;
  if (!cobranca) return erro(res, 404, 'Não existe cobrança com o nosso número informado.');

  const processar = db.transaction(() => {
    db.prepare('INSERT INTO eventos_webhook (id_evento, nosso_numero) VALUES (?, ?)').run(id_evento, nosso_numero);
    db.prepare("UPDATE cobrancas SET status = 'PAGA', data_pagamento = ? WHERE nosso_numero = ?")
      .run(data_pagamento, nosso_numero);
  });
  try {
    processar();
    return res.status(200).json({ mensagem: 'Pagamento registrado com sucesso.', nosso_numero, status: 'PAGA' });
  } catch (error: any) {
    if (error?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(200).json({ mensagem: 'Evento já processado anteriormente.', idempotente: true });
    }
    return erro(res, 500, 'Não foi possível processar o aviso de pagamento.');
  }
});

app.use((err: any, _req: Request, res: Response, _next: unknown) => {
  if (err instanceof SyntaxError) return erro(res, 400, 'JSON inválido.');
  return erro(res, 500, 'Erro interno do servidor.');
});
