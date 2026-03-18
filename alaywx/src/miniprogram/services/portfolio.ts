import { repositories } from './repo';
import { priceService } from './price';
import { convertCurrency } from '../utils/fx';
import { Layer, Position, Signal, Asset } from './db';

interface Quote {
  symbol: string;
  price: number;
  asOf: number;
  source?: string;
}

async function resolveQuoteAsync(symbol: string, manualPrice: number | null): Promise<Quote | null> {
  if (manualPrice != null && Number.isFinite(manualPrice) && manualPrice > 0) {
    return { symbol, price: manualPrice, asOf: Date.now(), source: 'manual' };
  }
  if (symbol === 'CASH') return null;
  return priceService.getLatestAsync(symbol);
}

export const portfolioController = {
  async getLayerSummariesAsync(): Promise<any[]> {
    const [layers, positionsWithAssets, signals] = await Promise.all([
      repositories.layers.list(),
      repositories.positions.listWithAssets(),
      repositories.signals.list(),
    ]);

    const signalCountByLayer = new Map<string, number>();
    for (const s of signals) {
      // Handle both boolean (new) and number 1 (legacy)
      const isEnabled = s.enabled === true || (s.enabled as any) === 1;
      if (!isEnabled) continue;
      if (!s.layerId) continue;
      signalCountByLayer.set(s.layerId, (signalCountByLayer.get(s.layerId) || 0) + 1);
    }

    const layerMap = new Map<string, Layer>(layers.map(l => [l.id, l]));
    const layerAgg = new Map<string, { totalValue: number; costTotal: number; pnl: number }>();
    
    // Process positions
    for (const item of positionsWithAssets) {
      if (!item.asset) continue;
      const quote = await resolveQuoteAsync(item.asset.symbol, item.position.manualPrice ?? null);
      
      if (!quote) continue;

      const layer = layerMap.get(item.position.layerId);
      const layerCurrency = layer ? (layer.currency || 'USD') : 'USD';
      const assetCurrency = item.asset.currency || 'USD';

      // Value in asset currency
      const valueRaw = quote.price * item.position.quantity;
      const costRaw = item.position.costTotal;
      const pnlRaw = valueRaw - costRaw;
      
      // Convert to layer currency
      const value = convertCurrency(valueRaw, assetCurrency, layerCurrency);
      const cost = convertCurrency(costRaw, assetCurrency, layerCurrency);
      const pnl = convertCurrency(pnlRaw, assetCurrency, layerCurrency);
      
      let cur = layerAgg.get(item.position.layerId);
      if (!cur) {
        cur = { totalValue: 0, costTotal: 0, pnl: 0 };
        layerAgg.set(item.position.layerId, cur);
      }
      
      cur.totalValue += value;
      cur.costTotal += cost;
      cur.pnl += pnl;
    }

    return layers.map(layer => {
      const agg = layerAgg.get(layer.id) || { totalValue: 0, costTotal: 0, pnl: 0 };
      const pnlPct = agg.costTotal > 0 ? (agg.pnl / agg.costTotal) * 100 : null;
      return {
        layer,
        totalValue: agg.totalValue,
        pnl: agg.pnl,
        pnlPct,
        keySignalCount: signalCountByLayer.get(layer.id) || 0,
      };
    });
  },
  
  async getLayerPositionViewsAsync(layerId: string): Promise<any[]> {
    // We need to fetch positions for this layer and their assets
    const allPositions = await repositories.positions.listByLayer(layerId);
    const allAssets = await repositories.assets.list();
    const assetById = new Map<string, Asset>(allAssets.map(a => [a.id, a]));
    const result: any[] = [];
    
    for (const p of allPositions) {
      const asset = assetById.get(p.assetId);
      if (!asset) continue;
      const quote = await resolveQuoteAsync(asset.symbol, p.manualPrice || null); // manualPrice might be undefined
      const marketValue = quote ? quote.price * p.quantity : null;
      const pnl = marketValue != null ? marketValue - p.costTotal : null;
      const pnlPct = pnl != null && p.costTotal > 0 ? (pnl / p.costTotal) * 100 : null;
      result.push({ position: p, asset, quote, marketValue, pnl, pnlPct });
    }
    return result;
  },

  async getAssetAggregatesAsync(filter: { type?: string }): Promise<any[]> {
    const rows = await repositories.positions.listWithAssets();
    const map = new Map<string, any>();

    for (const item of rows) {
      if (!item.asset) continue;
      if (filter && filter.type && item.asset.type !== filter.type) continue;
      
      const quote = await resolveQuoteAsync(item.asset.symbol, item.position.manualPrice || null);
      const value = quote ? quote.price * item.position.quantity : null;
      const pnl = value != null ? value - item.position.costTotal : null;
      
      let cur = map.get(item.asset.id);
      if (!cur) {
        cur = {
          assetId: item.asset.id,
          symbol: item.asset.symbol,
          name: item.asset.name,
          type: item.asset.type,
          currency: item.asset.currency,
          quantity: 0,
          costTotal: 0,
          marketValue: 0,
          pnl: 0,
          pnlPct: null
        };
        map.set(item.asset.id, cur);
      }
      
      cur.quantity += item.position.quantity;
      cur.costTotal += item.position.costTotal;
      if (value != null) cur.marketValue += value;
      if (pnl != null) cur.pnl += pnl;
    }
    
    // Calculate PnL Pct
    const result = Array.from(map.values());
    for (const item of result) {
        if (item.costTotal > 0 && item.pnl != null) {
            item.pnlPct = (item.pnl / item.costTotal) * 100;
        }
    }

    return result.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }
};
