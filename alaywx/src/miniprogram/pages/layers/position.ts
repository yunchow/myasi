import { repositories } from '../../services/repo';
import { formatMoney } from '../../utils/format';

Page({
  data: {
    statusBarHeight: 20,
    layerId: '',
    positionId: null as string | null,
    isEdit: false,
    
    layers: [] as any[],
    selectedLayerId: '',
    
    symbol: '',
    assetName: '',
    type: 'stock',
    currency: 'USD',
    
    quantity: '1',
    costTotal: '0',
    manualPrice: '',
    
    typeLabels: [
      { t: 'stock', label: '股票' },
      { t: 'fund', label: '基金' },
      { t: 'cash', label: '现金' },
      { t: 'index', label: '指数' },
      { t: 'insurance', label: '保险' },
      { t: 'other', label: '其他' }
    ],
    
    transactions: [] as any[],
    signals: [] as any[]
  },

  onLoad(options: any) {
    const { statusBarHeight } = wx.getWindowInfo();
    this.setData({ statusBarHeight });

    const { layerId, positionId } = options;
    this.setData({
      layerId: layerId || '',
      positionId: positionId || null,
      isEdit: !!positionId,
      selectedLayerId: layerId || ''
    });
    
    wx.setNavigationBarTitle({ title: positionId ? '编辑资产' : '录入资产' });
    
    this.loadLayers();
  },
  
  onShow() {
    if (this.data.positionId) {
      this.loadPosition(this.data.positionId);
      this.loadTransactions();
      this.loadSignals();
    }
  },

  async loadLayers() {
    const layers = await repositories.layers.list();
    this.setData({ layers });
    if (!this.data.selectedLayerId && layers.length > 0) {
      this.setData({ selectedLayerId: layers[0].id });
    }
  },

  async loadPosition(id: string) {
    const pos = await repositories.positions.get(id);
    if (!pos) return;
    
    this.setData({
      selectedLayerId: pos.layerId,
      quantity: String(pos.quantity),
      costTotal: String(pos.costTotal),
      manualPrice: pos.manualPrice == null ? '' : String(pos.manualPrice)
    });
    
    const asset = await repositories.assets.get(pos.assetId);
    if (asset) {
      this.setData({
        symbol: asset.symbol,
        assetName: asset.name,
        type: asset.type,
        currency: asset.currency
      });
    }
  },
  
  async loadTransactions() {
    if (!this.data.positionId) return;
    const txs = await repositories.transactions.listByPosition(this.data.positionId);
    this.setData({
      transactions: txs.map((t: any) => ({
        ...t,
        dateStr: new Date(t.createdAt).toLocaleDateString(), // Simple date
        priceStr: formatMoney(t.price, this.data.currency),
        totalStr: formatMoney(t.price * t.quantity, this.data.currency)
      }))
    });
  },
  
  async loadSignals() {
    if (!this.data.positionId) return;
    const sigs = await repositories.signals.list({ positionId: this.data.positionId });
    this.setData({
      signals: sigs.map((s: any) => ({
        ...s,
        desc: `${s.trigger === 'pnlPctAbove' ? '收益率 >' : '收益率 <'} ${s.thresholdPct}%`
      }))
    });
  },

  onLayerSelect(e: any) {
    this.setData({ selectedLayerId: e.currentTarget.dataset.id });
  },

  onAddLayer() {
    wx.navigateTo({ url: '/pages/layers/edit' });
  },

  onSymbolInput(e: any) {
    this.setData({ symbol: e.detail.value.toUpperCase() });
  },

  onAssetNameInput(e: any) {
    this.setData({ assetName: e.detail.value });
  },

  onTypeSelect(e: any) {
    this.setData({ type: e.currentTarget.dataset.type });
  },

  onCurrencySelect(e: any) {
    this.setData({ currency: e.currentTarget.dataset.currency });
  },

  onQuantityInput(e: any) {
    this.setData({ quantity: e.detail.value });
  },

  onCostInput(e: any) {
    this.setData({ costTotal: e.detail.value });
  },

  onManualPriceInput(e: any) {
    this.setData({ manualPrice: e.detail.value });
  },

  async onSave() {
    const {
      positionId, selectedLayerId, symbol, assetName, type, currency,
      quantity, costTotal, manualPrice
    } = this.data;

    if (!symbol.trim() || !selectedLayerId) return;

    const qty = Number(quantity);
    const cost = Number(costTotal);
    const price = manualPrice.trim() ? Number(manualPrice) : null;

    const id = await repositories.positions.upsert({
      id: positionId,
      layerId: selectedLayerId,
      asset: {
        symbol: symbol.trim().toUpperCase(),
        name: assetName.trim() || symbol.trim().toUpperCase(),
        type,
        currency
      },
      quantity: Number.isFinite(qty) ? qty : 0,
      costTotal: Number.isFinite(cost) ? cost : 0,
      manualPrice: (price !== null && Number.isFinite(price)) ? price : null
    });

    if (positionId) {
      wx.navigateBack();
    } else {
      wx.navigateBack();
    }
  },

  onDelete() {
    wx.showModal({
      title: '删除资产',
      content: `确认删除 ${this.data.symbol} 这条持仓？`,
      confirmText: '删除',
      confirmColor: '#FF453A',
      success: async (res) => {
        if (res.confirm && this.data.positionId) {
          await repositories.positions.remove(this.data.positionId);
          wx.navigateBack();
        }
      }
    });
  },

  onCancel() {
    wx.navigateBack();
  },
  
  onAddTransaction() {
    if (!this.data.positionId) return;
    wx.navigateTo({
      url: `/pages/layers/transaction?positionId=${this.data.positionId}&symbol=${this.data.symbol}`
    });
  },
  
  onAddSignal() {
    if (!this.data.positionId) return;
    wx.navigateTo({
      url: `/pages/layers/signal?positionId=${this.data.positionId}&layerId=${this.data.selectedLayerId}`
    });
  },
  
  onEditSignal(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/layers/signal?id=${id}&positionId=${this.data.positionId}&layerId=${this.data.selectedLayerId}`
    });
  }
});
