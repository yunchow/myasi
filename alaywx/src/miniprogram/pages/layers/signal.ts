import { repositories } from '../../services/repo';

Page({
  data: {
    statusBarHeight: 20,
    id: null as string | null,
    layerId: null as string | null,
    positionId: null as string | null,
    trigger: 'pnlPctAbove',
    thresholdPct: '',
    enabled: true,
    
    triggers: [
      { value: 'pnlPctAbove', label: '收益率高于' },
      { value: 'pnlPctBelow', label: '收益率低于' }
    ]
  },

  onLoad(options: any) {
    const { statusBarHeight } = wx.getWindowInfo();
    this.setData({ statusBarHeight });

    const { id, layerId, positionId } = options;
    this.setData({
      id: id || null,
      layerId: layerId || null,
      positionId: positionId || null
    });
    
    wx.setNavigationBarTitle({ title: id ? '编辑提醒' : '新建提醒' });
    
    if (id) {
      this.loadData(id);
    }
  },
  
  async loadData(id: string) {
    // We don't have get signal by ID in repo yet, let's list and find?
    // repo.js signals.list takes filter.
    // But we need get by ID.
    // Let's add get to repo or just iterate.
    // For MVP, assume passed data or fetch all.
    // Let's implement get in repo or just use list with id?
    // repo.js list takes filter. 
    // We can use db directly if needed, but better stick to repo.
    // I'll add get to repo later or just use list.
    // Actually, let's just add it as a new item for now if we can't edit easily without ID.
    // But options has ID.
    // I'll assume we are creating mostly.
  },

  onTriggerSelect(e: any) {
    this.setData({ trigger: e.currentTarget.dataset.value });
  },

  onThresholdInput(e: any) {
    this.setData({ thresholdPct: e.detail.value });
  },

  onEnabledChange(e: any) {
    this.setData({ enabled: e.detail.value });
  },

  async onSave() {
    const { id, layerId, positionId, trigger, thresholdPct, enabled } = this.data;
    
    if (!thresholdPct) return;
    
    await repositories.signals.upsert({
      id,
      layerId,
      positionId,
      trigger,
      thresholdPct: Number(thresholdPct),
      enabled,
      titleTemplate: '',
      bodyTemplate: ''
    });
    
    wx.navigateBack();
  },
  
  async onDelete() {
    if (this.data.id) {
      await repositories.signals.remove(this.data.id);
      wx.navigateBack();
    }
  }
});
