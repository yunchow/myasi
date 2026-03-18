import { portfolioController } from '../../services/portfolio';
import { repositories } from '../../services/repo';
import { formatMoney, formatPct } from '../../utils/format';
import { convertCurrency } from '../../utils/fx';

Page({
  data: {
    statusBarHeight: 20,
    layerId: null as string | null,
    layerName: '分层',
    positions: [] as any[],
    totalValueStr: '¥ 0.00',
    totalPnl: 0,
    totalPnlStr: '0.00',
    totalPctStr: '0.00%',
    refreshing: false
  },

  onLoad(options: any) {
    const { statusBarHeight } = wx.getWindowInfo();
    this.setData({ statusBarHeight });

    if (options.id) {
      this.setData({ layerId: options.id });
    }
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    const { layerId } = this.data;
    if (!layerId) return;

    try {
      const layer = await repositories.layers.get(layerId);
      const views = await portfolioController.getLayerPositionViewsAsync(layerId);

      wx.setNavigationBarTitle({ title: layer ? layer.name : '分层明细' });
      
      const layerCurrency = layer ? (layer.currency || 'USD') : 'USD';

      let totalValue = 0;
      let totalCost = 0;
      
      const positions = views.map((item: any) => {
        const marketValue = item.marketValue || 0;
        const assetCurrency = item.asset.currency || 'USD';
        
        // Convert to layer currency for total aggregation
        totalValue += convertCurrency(marketValue, assetCurrency, layerCurrency);
        totalCost += convertCurrency(item.position.costTotal, assetCurrency, layerCurrency);
        
        // Display in asset's original currency
        return {
          ...item,
          marketValueStr: item.marketValue == null ? '--' : formatMoney(item.marketValue, assetCurrency),
          pnlStr: item.pnl == null ? '--' : item.pnl.toFixed(2),
          pnlPctStr: item.pnlPct == null ? '--' : formatPct(item.pnlPct),
          costStr: formatMoney(item.position.costTotal, assetCurrency)
        };
      });

      const totalPnl = totalValue - totalCost;
      const totalPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

      this.setData({
        layerName: layer ? layer.name : '分层',
        positions,
        totalValueStr: formatMoney(totalValue, layerCurrency),
        totalPnl,
        totalPnlStr: totalPnl.toFixed(2),
        totalPctStr: `${totalPnl >= 0 ? '+' : ''}${formatPct(totalPct)}`,
        refreshing: false
      });
    } catch (e) {
      console.error(e);
      this.setData({ refreshing: false });
    }
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadData();
  },

  onAddPosition() {
    wx.navigateTo({ url: `/pages/layers/position?layerId=${this.data.layerId}` });
  },

  onRebalance() {
    wx.showModal({
      title: '再平衡',
      content: '已预留入口：后续支持跨分层快速调整份额归属。',
      showCancel: false
    });
  },

  onPositionTap(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/layers/position?layerId=${this.data.layerId}&positionId=${id}` });
  }
});
