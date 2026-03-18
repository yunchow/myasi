import { repositories } from '../../services/repo';
import { formatMoney } from '../../utils/format';

Page({
  data: {
    statusBarHeight: 20,
    positionId: '',
    symbol: '',
    
    type: 'buy',
    quantity: '',
    price: '',
    fee: '',
    note: '',
    
    date: new Date().toISOString().substring(0, 10),
    
    typeLabels: [
      { t: 'buy', label: '买入' },
      { t: 'sell', label: '卖出' },
      { t: 'dividend', label: '分红' },
      { t: 'fee', label: '费用' }
    ]
  },

  onLoad(options: any) {
    const { statusBarHeight } = wx.getWindowInfo();
    this.setData({ statusBarHeight });

    const { positionId, symbol } = options;
    this.setData({ positionId, symbol });
    
    wx.setNavigationBarTitle({ title: `${symbol} 交易记录` });
  },

  onTypeSelect(e: any) {
    this.setData({ type: e.currentTarget.dataset.type });
  },

  onQuantityInput(e: any) {
    this.setData({ quantity: e.detail.value });
  },

  onPriceInput(e: any) {
    this.setData({ price: e.detail.value });
  },

  onFeeInput(e: any) {
    this.setData({ fee: e.detail.value });
  },

  onNoteInput(e: any) {
    this.setData({ note: e.detail.value });
  },

  onDateChange(e: any) {
    this.setData({ date: e.detail.value });
  },

  async onSave() {
    const { positionId, type, quantity, price, fee, note, date } = this.data;
    
    if (!quantity || !price) return;
    
    await repositories.transactions.add({
      positionId,
      type,
      quantity: Number(quantity),
      price: Number(price),
      fee: Number(fee) || 0,
      note,
      date
    });
    
    // Update position cost/quantity? 
    // This is complex. For now just record tx.
    // Ideally we should update position average cost.
    
    wx.navigateBack();
  }
});
