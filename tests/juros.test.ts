import { describe, expect, it } from 'vitest';
import { calcularValorAtualizado } from '../src/juros';

describe('calcularValorAtualizado', () => {
  it('não aplica encargos antes ou no vencimento', () => {
    expect(calcularValorAtualizado(189.90, '2026-10-05', '2026-10-01')).toBe(189.90);
    expect(calcularValorAtualizado(189.90, '2026-10-05', '2026-10-05')).toBe(189.90);
  });
  it('aplica multa única e juros simples após o vencimento', () => {
    expect(calcularValorAtualizado(189.90, '2026-10-05', '2026-10-06')).toBe(193.76);
    expect(calcularValorAtualizado(189.90, '2026-10-05', '2026-10-15')).toBe(194.32);
  });
  it('rejeita datas inválidas', () => {
    expect(() => calcularValorAtualizado(100, '2026-02-30', '2026-03-01')).toThrow();
  });
});
