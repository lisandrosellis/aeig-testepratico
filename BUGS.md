# Parte B — Análise e correção dos defeitos

## Defeitos encontrados

1. **O laço começa em zero e usa `i <= diasAtraso`.** Isso cobra encargos mesmo quando o pagamento ocorre no vencimento e também executa uma iteração a mais nos atrasos. Para o associado, significa pagar multa/juros indevidos ou pagar um dia extra de encargos.
2. **A multa de 2% é aplicada em todas as iterações.** A regra determina multa única. O código repete a multa a cada dia, aumentando artificialmente a dívida.
3. **Os juros são calculados sobre `total`, que cresce a cada iteração.** Isso produz juros compostos, embora a regra determine juros simples sobre o valor original. O associado acaba pagando juros sobre encargos anteriores.
4. **Não há arredondamento final para centavos.** O resultado pode conter frações de centavo e gerar divergência em cobranças e pagamentos.
5. **A função não valida as datas nem o valor recebido.** Datas impossíveis ou entradas inválidas podem produzir resultados silenciosamente incorretos, em vez de um erro claro.

## Versão corrigida

```ts
export function calcularValorAtualizado(valor: number, vencimento: string, dataPagamento: string): number {
  if (!Number.isFinite(valor) || valor < 0) throw new Error('O valor deve ser um número não negativo.');
  const parseData = (data: string): number => {
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(data)) throw new Error('Data inválida. Use AAAA-MM-DD.');
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
```

## Valores solicitados

Mensalidade original: **R$ 189,90**. Vencimento: **05/10/2026**.

| Data do pagamento | Dias de atraso | Cálculo | Valor correto |
|---|---:|---|---:|
| 01/10/2026 | 0 | Antes do vencimento, sem encargos | **R$ 189,90** |
| 05/10/2026 | 0 | No vencimento, sem encargos | **R$ 189,90** |
| 06/10/2026 | 1 | 189,90 × (1 + 0,02 + 0,00033) | **R$ 193,76** |
| 15/10/2026 | 10 | 189,90 × (1 + 0,02 + 0,0033) | **R$ 194,32** |

A contagem considera dias corridos completos entre as datas, sem cobrar encargos no próprio dia do vencimento.
