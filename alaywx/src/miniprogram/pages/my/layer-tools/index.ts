import { repositories } from '../../../services/repo';
import { generateLayerColor } from '../../../utils/color';

const app = getApp();

Page({
  data: {
    layers: [] as any[]
  },

  onShow() {
    this.loadLayers();
  },

  async loadLayers() {
    wx.showLoading({ title: '加载中' });
    try {
      const layers = await repositories.layers.list();
      const layersWithColor = layers.map(l => ({
        ...l,
        color: generateLayerColor(l._id || l.id)
      }));
      this.setData({ layers: layersWithColor });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      console.error(e);
    } finally {
      wx.hideLoading();
    }
  },

  onAddLayer() {
    wx.navigateTo({ url: '/pages/my/layer-tools/edit/index' });
  },

  onEditLayer(e: any) {
    const layer = e.currentTarget.dataset.item;
    const id = layer._id || layer.id;
    wx.navigateTo({ url: `/pages/my/layer-tools/edit/index?id=${id}` });
  },

  async onDeleteLayer(e: any) {
    const layerId = e.currentTarget.dataset.id;
    const layerName = e.currentTarget.dataset.name;
    
    const res = await wx.showModal({
      title: '确认删除',
      content: `确定要删除分层 "${layerName}" 吗？该操作不可恢复。`,
      confirmColor: '#FF3B30'
    });
    
    if (res.confirm) {
      wx.showLoading({ title: '删除中' });
      try {
        await repositories.layers.remove(layerId);
        await this.loadLayers();
        wx.showToast({ title: '已删除', icon: 'success' });
      } catch (e) {
        wx.showToast({ title: '删除失败', icon: 'none' });
        console.error(e);
      } finally {
        wx.hideLoading();
      }
    }
  }
});
