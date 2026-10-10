import i18n from '@/i18n';

/** 12.5 → "12.5%" in English, "12,5 %" in French. */
export const formatPercent = (value: number): string =>
  new Intl.NumberFormat(i18n.language, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);

export const formatDecimal = (value: number, digits: number): string =>
  new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
