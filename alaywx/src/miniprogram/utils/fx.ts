// Simple FX rates relative to USD (approximate, for MVP)
const rates: { [key: string]: number } = {
  USD: 1,
  CNY: 0.14, // 1 CNY = 0.14 USD
  HKD: 0.128, // 1 HKD = 0.128 USD
  JPY: 0.0067,
  EUR: 1.09,
  GBP: 1.27,
  BTC: 65000, // Example
  ETH: 3500
};

export function convertCurrency(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  
  const fromRate = rates[from] || 1;
  const toRate = rates[to] || 1;
  
  // Convert from -> USD -> to
  const amountInUSD = amount * fromRate;
  return amountInUSD / toRate;
}

export function getCurrencySymbol(currency: string): string {
  const symbols: { [key: string]: string } = {
    CNY: '¥',
    USD: '$',
    HKD: 'HK$',
    JPY: '¥',
    EUR: '€',
    GBP: '£',
    BTC: '₿',
    ETH: 'Ξ'
  };
  return symbols[currency] || currency;
}
