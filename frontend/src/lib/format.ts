export function formatCurrency(value?: number) {
  if (value === undefined) return '-';

  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0
  }).format(value);
}
