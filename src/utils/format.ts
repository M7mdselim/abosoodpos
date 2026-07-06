export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} SAR`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB");
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export function nextOilChangeKm(currentKm: number): number {
  return currentKm + 5000;
}
