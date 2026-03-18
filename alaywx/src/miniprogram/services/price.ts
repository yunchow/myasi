interface PriceCache {
  symbol: string;
  price: number;
  asOf: number;
  source?: string;
  [key: string]: any;
}

const cache = new Map<string, PriceCache>();

// Helper to normalize symbol
function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export const priceService = {
  getCached(symbol: string): PriceCache | null {
    const key = normalizeSymbol(symbol);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.asOf < 300000) { // 5 min cache
      return cached;
    }
    return null;
  },

  async getLatestAsync(symbol: string): Promise<PriceCache | null> {
    const key = normalizeSymbol(symbol);
    const cached = this.getCached(key);
    if (cached) return cached;
    
    // Call cloud function
    try {
      const res = await wx.cloud.callFunction({
        name: 'fetchPrice',
        data: { symbols: [key] }
      });
      
      const result = res.result as { data?: PriceCache[] };
      if (result && result.data && result.data.length > 0) {
        const quote = result.data[0];
        cache.set(key, quote);
        return quote;
      }
    } catch (e) {
      console.error('Failed to fetch price for', key, e);
    }
    
    return null;
  },

  // Batch fetch support
  async getMultipleAsync(symbols: string[]): Promise<PriceCache[]> {
    const unique = [...new Set(symbols.map(normalizeSymbol))];
    const missing: string[] = [];
    const results: PriceCache[] = [];

    for (const s of unique) {
      const c = this.getCached(s);
      if (c) results.push(c);
      else missing.push(s);
    }

    if (missing.length > 0) {
      try {
        const res = await wx.cloud.callFunction({
          name: 'fetchPrice',
          data: { symbols: missing }
        });
        
        const result = res.result as { data?: PriceCache[] };
        if (result && result.data) {
          for (const q of result.data) {
            cache.set(normalizeSymbol(q.symbol), q);
            results.push(q);
          }
        }
      } catch (e) {
        console.error('Failed to fetch multiple prices', e);
      }
    }

    return results;
  }
};
