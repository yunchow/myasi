import { portfolioController } from '../../services/portfolio';
import { formatMoney, formatPct } from '../../utils/format';
import { generateLayerColor, generateGradient } from '../../utils/color';
import { convertCurrency } from '../../utils/fx';

Page({
  data: {
    statusBarHeight: 20,
    layers: [] as any[],
    totalAmount: '¥ 0.00',
    totalPnl: 0,
    totalPnlStr: '0.00',
    totalPnlPctStr: '0.00%',
    refreshing: false,
    headerBg: 'linear-gradient(135deg, #254748ff 0%, #172e3dff 100%)', // Ensure dark teal gradient
    headerClass: '',
  },

  onLoad() {
    const { statusBarHeight } = wx.getWindowInfo();
    this.setData({ statusBarHeight });
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const summaries = await portfolioController.getLayerSummariesAsync();
      
      let totalValueCNY = 0;
      let totalPnlCNY = 0;
      let totalCostCNY = 0;
      
      const layers = summaries.map((item: any) => {
        const currency = item.layer.currency || 'USD';
        
        // Aggregate to CNY for grand total
        totalValueCNY += convertCurrency(item.totalValue, currency, 'CNY');
        totalPnlCNY += convertCurrency(item.pnl, currency, 'CNY');
        
        const cost = item.totalValue - item.pnl;
        totalCostCNY += convertCurrency(cost, currency, 'CNY');
        
        const keyMetricStr = item.layer.keyMetric === 'totalValue' 
          ? formatMoney(item.totalValue, currency)
          : item.layer.keyMetric === 'pnl'
            ? `${currency === 'USD' ? '$' : currency === 'CNY' ? '¥' : currency} ${item.pnl.toFixed(2)}`
            : item.pnlPct == null ? '--' : formatPct(item.pnlPct);
            
        const signalText = item.keySignalCount > 0 ? `· 已配置 ${item.keySignalCount} 个提醒` : '';

        return {
          ...item,
          totalValueStr: formatMoney(item.totalValue, currency),
          pnlStr: item.pnl.toFixed(2),
          pnlPctStr: item.pnlPct == null ? '' : `${item.pnlPct >= 0 ? '+' : ''}${formatPct(item.pnlPct)}`,
          color: generateLayerColor(item.layer._id || item.layer.id),
          bg: generateGradient(item.layer._id || item.layer.id),
          keyMetricStr,
          signalText,
          currency
        };
      });

      const totalPct = totalCostCNY > 0 ? (totalPnlCNY / totalCostCNY) * 100 : 0;
      
      this.setData({
        layers,
        totalAmount: formatMoney(totalValueCNY, 'CNY'),
        totalPnl: totalPnlCNY,
        totalPnlStr: totalPnlCNY.toFixed(2),
        totalPnlPctStr: `${totalPnlCNY >= 0 ? '+' : ''}${formatPct(totalPct)}`,
        refreshing: false,
        headerBg: 'linear-gradient(135deg, #254748ff 0%, #172e3dff 100%)', // Ensure orange gradient
        headerClass: '' // Ensure default (light) text
      });
    } catch (e) {
      console.error(e);
      this.setData({ refreshing: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadData();
  },

  onAddLayer() {
    wx.navigateTo({ url: '/pages/my/layer-tools/index' }); // Redirect to new manager
  },

  onLayerTap(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/layers/detail?id=${id}` });
  }
});
