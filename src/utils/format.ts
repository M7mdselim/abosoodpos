export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} ج.م`;
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ar-EG");
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : `${d.toLocaleDateString("ar-EG")} ${d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`;
}

export function nextOilChangeKm(currentKm: number): number {
  return currentKm + 5000;
}
