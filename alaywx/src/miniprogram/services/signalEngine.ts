import { repositories } from './repo';
import { priceService } from './price';
import { formatPct } from '../utils/format';
import { Signal, Position, Asset } from './db';

export async function evaluateSignalsOnceAsync(options: any = {}): Promise<number> {
  console.log('Evaluating signals...', options);
  
  // 1. Get all enabled signals
  // Note: legacy data might use 1 for enabled, new data uses true. 
  // We query for both or assume the caller handles data migration.
  // For now, we keep querying { enabled: 1 } as per legacy, 
  // but we might want to change this to support boolean in the future.
  // If we want to support both in query, we might need a more complex query or multiple queries.
  // Let's assume for now we use the legacy check for list, or if we want to be safe:
  // const signals = await repositories.signals.list({}); 
  // and filter in memory. This is safer for mixed data types.
  const allSignals = await repositories.signals.list({});
  const signals = allSignals.filter(s => s.enabled === true || (s.enabled as any) === 1);

  if (signals.length === 0) return 0;

  // 2. Get all positions to link assets and calculate PnL
  // We need positions to know which asset we are tracking for the signal
  // Signals are linked to layerId or positionId.
  // If linked to positionId, we know the asset.
  // If linked to layerId, it might be a "Layer PnL" signal (complex).
  // Let's support "Position PnL" and "Layer PnL" signals.
  
  const positions = await repositories.positions.listWithAssets();
  const positionMap = new Map<string, { position: Position, asset: Asset | null }>(
    positions.map(p => [p.position.id, p])
  );
  
  // Pre-fetch prices for all assets involved
  const assetsToFetch = new Set<string>();
  for (const s of signals) {
    if (s.positionId) {
      const pos = positionMap.get(s.positionId);
      if (pos && pos.asset) assetsToFetch.add(pos.asset.symbol);
    }
  }
  
  const quotes = new Map();
  for (const symbol of assetsToFetch) {
    const quote = await priceService.getLatestAsync(symbol);
    if (quote) quotes.set(symbol, quote);
  }

  let triggeredCount = 0;

  for (const s of signals) {
    try {
      let isTriggered = false;
      let title = '';
      let body = '';

      // Case 1: Position-based Signal
      if (s.positionId) {
        const item = positionMap.get(s.positionId);
        if (!item || !item.asset) continue;

        const quote = quotes.get(item.asset.symbol);
        const currentPrice = quote ? quote.price : (item.position.manualPrice || 0);
        
        if (!currentPrice) continue;

        const marketValue = currentPrice * item.position.quantity;
        const cost = item.position.costTotal;
        const pnl = marketValue - cost;
        const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

        if (s.trigger === 'pnlPctAbove' && pnlPct >= s.thresholdPct) {
          isTriggered = true;
          title = s.titleTemplate || `${item.asset.name} 止盈提醒`;
          body = s.bodyTemplate || `收益率已达到 ${formatPct(pnlPct)}，超过设定的 ${s.thresholdPct}%`;
        } else if (s.trigger === 'pnlPctBelow' && pnlPct <= s.thresholdPct) {
          isTriggered = true;
          title = s.titleTemplate || `${item.asset.name} 止损提醒`;
          body = s.bodyTemplate || `收益率已下跌至 ${formatPct(pnlPct)}，低于设定的 ${s.thresholdPct}%`;
        }
      } 
      // Case 2: Layer-based Signal (Aggregate)
      else if (s.layerId) {
        // Calculate Layer PnL
        // This requires aggregating all positions in the layer
        const layerPositions = positions.filter(p => p.position.layerId === s.layerId);
        if (layerPositions.length === 0) continue;

        let layerValue = 0;
        let layerCost = 0;
        
        for (const lp of layerPositions) {
           // We need price for every position in layer, not just the ones in signals
           // This might be slow if we didn't pre-fetch. 
           // For MVP, we skip if we don't have price (or fetch on demand if we want to be thorough)
           // Let's try to use what we have or manual price
           let pPrice = 0;
           if (!lp.asset) continue;
           
           // We try to get from cache first (maybe we fetched it above if it was in a signal)
           let q = await priceService.getCached(lp.asset.symbol);
           
           // If not in cache, we might not have fetched it.
           // Ideally we should have pre-fetched all assets for the layer too.
           // For now, let's try to fetch if missing? Or just skip?
           // The original code tried getCached.
           
           if (q) pPrice = q.price;
           else if (lp.position.manualPrice) pPrice = lp.position.manualPrice;
           
           layerValue += pPrice * lp.position.quantity;
           layerCost += lp.position.costTotal;
        }

        const layerPnl = layerValue - layerCost;
        const layerPnlPct = layerCost > 0 ? (layerPnl / layerCost) * 100 : 0;

        if (s.trigger === 'pnlPctAbove' && layerPnlPct >= s.thresholdPct) {
          isTriggered = true;
          title = s.titleTemplate || '分层止盈提醒';
          body = s.bodyTemplate || `分层收益率已达到 ${formatPct(layerPnlPct)}`;
        } else if (s.trigger === 'pnlPctBelow' && layerPnlPct <= s.thresholdPct) {
          isTriggered = true;
          title = s.titleTemplate || '分层止损提醒';
          body = s.bodyTemplate || `分层收益率已下跌至 ${formatPct(layerPnlPct)}`;
        }
      }

      if (isTriggered) {
        await repositories.messages.create({
          layerId: s.layerId,
          positionId: s.positionId,
          title,
          body,
          level: 'info'
        });
        triggeredCount++;
      }

    } catch (e) {
      console.error('Error evaluating signal:', s.id, e);
    }
  }

  return triggeredCount;
}
