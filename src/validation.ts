export function somenteDigitos(value: string): string {
  return value.replace(/\D/g, '');
}

export function cpfValido(value: string): boolean {
  const cpf = somenteDigitos(value);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;

  const calcularDigito = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const primeiro = calcularDigito(cpf.slice(0, 9), 10);
  const segundo = calcularDigito(cpf.slice(0, 9) + primeiro, 11);
  return cpf.endsWith(`${primeiro}${segundo}`);
}

export function dinheiroParaCentavos(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.round((value + Number.EPSILON) * 100);
}

export function mesReferenciaValido(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function dataISOValida(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
