export function sanitizeMoneyInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole, ...decimalParts] = cleaned.split(".");
  if (decimalParts.length === 0) return whole;
  return `${whole}.${decimalParts.join("").slice(0, 2)}`;
}

export function parseMoneyInput(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMoneyInput(value: number) {
  return Math.max(0, value).toFixed(2);
}

export function balanceMoneyInput(total: number, value: string) {
  return formatMoneyInput(total - parseMoneyInput(value));
}
