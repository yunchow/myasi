// 云函数入口文件
import * as cloud from 'wx-server-sdk';
import axios from 'axios';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV as any
});

// 云函数入口函数
export async function main(event: any, context: any) {
  const { symbols } = event;
  
  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
    return { error: 'Invalid symbols' };
  }

  const results: any[] = [];
  
  // Use Stooq for free data (supports US stocks, indices, etc.)
  // Format: Symbol, Date, Time, Open, High, Low, Close, Volume
  // URL: https://stooq.com/q/l/?s=AAPL.US&f=sd2t2ohlcv&h&e=csv
  
  // We can fetch multiple symbols in one request: s=AAPL.US+GOOG.US
  // But Stooq limits length. For simplicity, we fetch individually or in small batches.
  // Actually, let's try fetching individually for robustness in this MVP.
  
  const tasks = symbols.map(async (sym: string) => {
    try {
      // Normalize symbol for Stooq
      let s = sym.toUpperCase();
      if (!s.includes('.') && s !== 'CASH') {
        // Assume US if not specified, unless it looks like HK (number)
        if (/^\d{4,5}$/.test(s)) s = `${s}.HK`;
        else s = `${s}.US`;
      }
      
      const url = `https://stooq.com/q/l/?s=${encodeURIComponent(s)}&f=sd2t2ohlcv&h&e=csv`;
      
      const res = await axios.get(url, { timeout: 10000 }); // Add request timeout
      const data = res.data;
      
      // Parse CSV
      const lines = data.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(',');
        // Symbol,Date,Time,Open,High,Low,Close,Volume
        // AAPL.US,2023-10-27,22:00:00,166.91,168.96,166.83,168.22,58499129
        
        const close = parseFloat(parts[6]);
        if (!isNaN(close)) {
          results.push({
            symbol: sym, // Return original symbol requested
            price: close,
            asOf: Date.now(),
            source: 'stooq'
          });
        }
      }
    } catch (e) {
      console.error(`Failed to fetch ${sym}`, e);
    }
  });

  await Promise.all(tasks);
  
  return { data: results };
}
