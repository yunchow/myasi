export function formatMoney(value: number, currency: string): string {
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 0 : abs >= 100 ? 1 : 2;
  const fixed = value.toFixed(digits);
  return `${currency} ${fixed}`;
}

export function formatPct(value: number): string {
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return `${value.toFixed(digits)}%`;
}
