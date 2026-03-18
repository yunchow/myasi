// 云函数入口文件
import * as cloud from 'wx-server-sdk';
import axios from 'axios';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV as any
});

const db = cloud.database();
const _ = db.command;

// Helper: Normalize Symbol
function normalizeSymbol(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  if (s === 'CASH') return s;
  if (s.includes('.')) return s;
  // Default to US if not specified, heuristic
  if (/^\d{4,5}$/.test(s)) return `${s}.HK`;
  return `${s}.US`;
}

// Helper: Fetch Prices (Batch)
async function fetchPrices(symbols: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(symbols.map(normalizeSymbol))];
  const results = new Map<string, number>();
  
  // Stooq limits, let's fetch one by one for robustness in this demo
  // Production should use batch or better API
  for (const s of unique) {
    if (s === 'CASH') {
      results.set('CASH', 1.0);
      continue;
    }
    
    try {
      const url = `https://stooq.com/q/l/?s=${encodeURIComponent(s)}&f=sd2t2ohlcv&h&e=csv`;
      const res = await axios.get(url, { timeout: 5000 });
      const lines = res.data.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(',');
        const close = parseFloat(parts[6]);
        if (!isNaN(close)) {
          results.set(s, close);
        }
      }
    } catch (e: any) {
      console.error(`Failed to fetch ${s}`, e.message);
    }
  }
  return results;
}

// 云函数入口函数
export async function main(event: any, context: any) {
  console.log('Start monitoring signals...');
  
  try {
    // 1. Get all enabled signals
    // Note: Cloud function can read all data if permissions allow, 
    // or we use cloud.database({ throwOnNotFound: false })
    // But default ACL might restrict to creator. 
    // To monitor ALL users, this function needs "super admin" privileges (which cloud function has by default).
    
    // We need to fetch signals across all users.
    // However, db.collection('signals').get() might only return current user's data if called from client.
    // But here in cloud function, it returns everything if we don't specify _openid?
    // Actually, cloud function SDK runs with admin privileges usually.
    
    const signalsResult: any = await db.collection('signals').where({ enabled: true }).limit(1000).get();
    const signals = signalsResult.data;
    
    if (signals.length === 0) {
      console.log('No enabled signals.');
      return { status: 'success', triggered: 0 };
    }
    
    // 2. Collect related positions to get symbols
    const positionIds = signals.map(s => s.positionId).filter(id => id);
    const layerIds = signals.map(s => s.layerId).filter(id => id); // Layer signals not fully supported in this simple version yet
    
    // We need positions to know assets.
    // Let's fetch all relevant positions.
    // Using 'in' query for positions
    let positions: any[] = [];
    // Split into chunks if too many
    for (let i = 0; i < positionIds.length; i += 100) {
       const batch = positionIds.slice(i, i + 100);
       if (batch.length > 0) {
         const res: any = await db.collection('positions').where({
           _id: _.in(batch)
         }).limit(100).get();
         positions = positions.concat(res.data);
       }
    }
    
    const posMap = new Map(positions.map(p => [p._id, p]));
    
    // 3. Collect asset IDs to get symbols
    const assetIds = positions.map(p => p.assetId).filter(id => id);
    let assets: any[] = [];
    for (let i = 0; i < assetIds.length; i += 100) {
       const batch = assetIds.slice(i, i + 100);
       if (batch.length > 0) {
         const res: any = await db.collection('assets').where({
           _id: _.in(batch)
         }).limit(100).get();
         assets = assets.concat(res.data);
       }
    }
    const assetMap = new Map(assets.map(a => [a._id, a]));
    
    // 4. Identify symbols to fetch
    const symbolsToFetch = new Set<string>();
    for (const p of positions) {
      const a = assetMap.get(p.assetId);
      if (a) symbolsToFetch.add(a.symbol);
    }
    
    // 5. Fetch prices
    const prices = await fetchPrices(Array.from(symbolsToFetch));
    
    // 6. Evaluate
    const messagesToCreate: any[] = [];
    
    for (const s of signals) {
      if (!s.positionId) continue; // Skip layer signals for now
      
      const pos = posMap.get(s.positionId);
      if (!pos) continue;
      
      const asset = assetMap.get(pos.assetId);
      if (!asset) continue;
      
      const symbol = normalizeSymbol(asset.symbol);
      const currentPrice = prices.get(symbol);
      
      // Fallback to manual price if no market price (and manual price exists)
      // But for monitoring, we usually want real-time. 
      // If no price, skip.
      if (currentPrice === undefined) continue;
      
      const marketValue = currentPrice * pos.quantity;
      const cost = pos.costTotal;
      const pnl = marketValue - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
      
      let isTriggered = false;
      let title = '';
      let body = '';
      
      if (s.trigger === 'pnlPctAbove' && pnlPct >= s.thresholdPct) {
          isTriggered = true;
          title = `${asset.name} 止盈提醒`;
          body = `收益率已达到 ${pnlPct.toFixed(2)}%，超过设定的 ${s.thresholdPct}%`;
      } else if (s.trigger === 'pnlPctBelow' && pnlPct <= s.thresholdPct) {
          isTriggered = true;
          title = `${asset.name} 止损提醒`;
          body = `收益率已下跌至 ${pnlPct.toFixed(2)}%，低于设定的 ${s.thresholdPct}%`;
      }
      
      if (isTriggered) {
        // Check duplication?
        // Simple dedupe: check if we sent a message for this signal recently?
        // For MVP, just send.
        
        messagesToCreate.push({
          _openid: s._openid, // Important: assign to correct user!
          layerId: s.layerId,
          positionId: s.positionId,
          title,
          body,
          level: 'warning',
          readAt: null,
          createdAt: Date.now(),
          fromMonitor: true
        });
      }
    }
    
    // 7. Save messages
    if (messagesToCreate.length > 0) {
      for (const msg of messagesToCreate) {
        await db.collection('messages').add({ data: msg });
        
        // TODO: Send Subscribe Message (Template Message) here
        // await cloud.openapi.subscribeMessage.send({ ... })
      }
    }
    
    return { status: 'success', triggered: messagesToCreate.length };
    
  } catch (err: any) {
    console.error(err);
    return { status: 'error', error: err.message };
  }
}
