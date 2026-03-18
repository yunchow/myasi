import { portfolioController } from '../../services/portfolio';
import { formatMoney, formatPct } from '../../utils/format';
import { generateGradient } from '../../utils/color';

Page({
  data: {
    statusBarHeight: 20,
    rows: [] as any[],
    filter: 'all',
    counts: {} as { [key: string]: number },
    filters: [
      { key: 'all', label: '全部' },
      { key: 'stock', label: '股票' },
      { key: 'fund', label: '基金' },
      { key: 'cash', label: '现金' },
      { key: 'index', label: '指数' },
      { key: 'insurance', label: '保险' },
      { key: 'other', label: '其他' }
    ],
    refreshing: false
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
      const allRows = await portfolioController.getAssetAggregatesAsync({});
      
      const counts: { [key: string]: number } = { all: allRows.length, stock: 0, fund: 0, cash: 0, index: 0, insurance: 0, other: 0 };
      allRows.forEach((r: any) => {
        if (counts[r.type] !== undefined) counts[r.type]++;
      });
      
      const filtered = this.data.filter === 'all' ? allRows : allRows.filter((r: any) => r.type === this.data.filter);
      
      const rows = filtered.map((item: any) => ({
        ...item,
        marketValueStr: item.marketValue == null ? '--' : formatMoney(item.marketValue, item.currency),
        pnlStr: item.pnl == null ? '--' : item.pnl.toFixed(2),
        pnlPctStr: item.pnlPct == null ? '--' : formatPct(item.pnlPct),
        costStr: formatMoney(item.costTotal, item.currency),
        bg: generateGradient(item.symbol || item.name) // Generate background based on symbol
      }));

      this.setData({ rows, counts, refreshing: false });
    } catch (e) {
      console.error(e);
      this.setData({ refreshing: false });
    }
  },

  onFilterSelect(e: any) {
    this.setData({ filter: e.currentTarget.dataset.filter }, () => {
      this.loadData();
    });
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadData();
  }
});
