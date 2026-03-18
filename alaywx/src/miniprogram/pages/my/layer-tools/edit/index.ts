import { repositories } from '../../../../services/repo';

Page({
  data: {
    isEdit: false,
    layerId: null as string | null,
    currencies: ['USD', 'CNY', 'HKD', 'JPY', 'EUR', 'GBP', 'BTC', 'ETH'],
    currencyIndex: 0,
    
    formData: {
      name: '',
      currency: 'USD',
      targetProfitPct: '',
      targetLossPct: '',
      keyMetric: ''
    }
  },

  async onLoad(options: any) {
    if (options.id) {
      wx.setNavigationBarTitle({ title: '编辑分层' });
      this.setData({ 
        isEdit: true, 
        layerId: options.id 
      });
      await this.loadLayer(options.id);
    } else {
      wx.setNavigationBarTitle({ title: '新建分层' });
    }
  },

  async loadLayer(id: string) {
    wx.showLoading({ title: '加载中' });
    try {
      const layer = await repositories.layers.get(id);
      if (layer) {
        const currencyIndex = this.data.currencies.indexOf(layer.currency || 'USD');
        this.setData({
          currencyIndex: currencyIndex >= 0 ? currencyIndex : 0,
          formData: {
            name: layer.name,
            currency: layer.currency || 'USD',
            targetProfitPct: layer.targetProfitPct ? String(layer.targetProfitPct) : '',
            targetLossPct: layer.targetLossPct ? String(layer.targetLossPct) : '',
            keyMetric: layer.keyMetric || ''
          }
        });
      }
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onInputChange(e: any) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  onCurrencyChange(e: any) {
    const index = e.detail.value;
    this.setData({
      currencyIndex: index,
      'formData.currency': this.data.currencies[index]
    });
  },

  async onSave() {
    const { name, currency, targetProfitPct, targetLossPct, keyMetric } = this.data.formData;
    
    if (!name) {
      wx.showToast({ title: '请输入分层名称', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '保存中' });
    try {
      const input: any = {
        name,
        currency,
        targetProfitPct: parseFloat(targetProfitPct as any) || 0,
        targetLossPct: parseFloat(targetLossPct as any) || 0,
        keyMetric
      };
      
      if (this.data.isEdit && this.data.layerId) {
        input.id = this.data.layerId;
      }
      
      await repositories.layers.upsert(input);
      
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
      console.error(e);
    } finally {
      wx.hideLoading();
    }
  }
});
