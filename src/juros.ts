/** Calcula multa única de 2% e juros simples de 0,033% por dia corrido. */
export function calcularValorAtualizado(valor: number, vencimento: string, dataPagamento: string): number {
  if (!Number.isFinite(valor) || valor < 0) throw new Error('O valor deve ser um número não negativo.');
  const parseData = (data: string): number => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error('Data inválida. Use AAAA-MM-DD.');
    const instante = Date.parse(`${data}T00:00:00.000Z`);
    if (!Number.isFinite(instante) || new Date(instante).toISOString().slice(0, 10) !== data) {
      throw new Error('Data inválida.');
    }
    return instante;
  };

  const vencimentoMs = parseData(vencimento);
  const pagamentoMs = parseData(dataPagamento);
  const diasAtraso = Math.max(0, Math.floor((pagamentoMs - vencimentoMs) / 86_400_000));
  if (diasAtraso === 0) return Math.round((valor + Number.EPSILON) * 100) / 100;

  const total = valor * (1 + 0.02 + diasAtraso * 0.00033);
  return Math.round((total + Number.EPSILON) * 100) / 100;
}
