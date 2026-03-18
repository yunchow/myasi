import { repositories } from '../../services/repo';

Page({
  data: {
    statusBarHeight: 20,
    id: null as string | null,
    name: '',
    keyMetric: 'pnlPct',
    targetProfitPct: '12',
    targetLossPct: '-8',
    isEdit: false
  },

  onLoad(options: any) {
    const { statusBarHeight } = wx.getWindowInfo();
    this.setData({ statusBarHeight });

    if (options.id) {
      this.setData({ id: options.id, isEdit: true });
      wx.setNavigationBarTitle({ title: '编辑分层' });
      this.loadData(options.id);
    } else {
      wx.setNavigationBarTitle({ title: '新建分层' });
    }
  },

  async loadData(id: string) {
    const layer = await repositories.layers.get(id);
    if (layer) {
      this.setData({
        name: layer.name,
        keyMetric: layer.keyMetric,
        targetProfitPct: layer.targetProfitPct != null ? String(layer.targetProfitPct) : '',
        targetLossPct: layer.targetLossPct != null ? String(layer.targetLossPct) : ''
      });
    }
  },

  onNameInput(e: any) {
    this.setData({ name: e.detail.value });
  },

  onKeyMetricChange(e: any) {
    this.setData({ keyMetric: e.currentTarget.dataset.value });
  },

  onProfitInput(e: any) {
    this.setData({ targetProfitPct: e.detail.value });
  },

  onLossInput(e: any) {
    this.setData({ targetLossPct: e.detail.value });
  },

  async onSave() {
    const { id, name, keyMetric, targetProfitPct, targetLossPct } = this.data;
    if (!name.trim()) return;

    const profit = Number(targetProfitPct);
    const loss = Number(targetLossPct);

    const layerId = await repositories.layers.upsert({
      id,
      name: name.trim(),
      keyMetric,
      targetProfitPct: Number.isFinite(profit) ? profit : null,
      targetLossPct: Number.isFinite(loss) ? loss : null
    });

    if (id) {
      wx.navigateBack();
    } else {
      wx.redirectTo({ url: `/pages/layers/detail?id=${layerId}` });
    }
  },

  onCancel() {
    wx.navigateBack();
  }
});
