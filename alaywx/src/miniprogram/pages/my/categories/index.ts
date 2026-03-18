import { repositories } from '../../../services/repo';

const app = getApp();

Page({
  data: {
    categories: [] as any[],
    isEditing: false,
    editingId: null as any,
    
    formData: {
      name: '',
      priority: 0
    }
  },

  onLoad() {
    this.loadData();
  },

  async loadData() {
    wx.showLoading({ title: '加载中' });
    try {
      const list = await repositories.categories.list();
      this.setData({ categories: list });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      console.error(e);
    } finally {
      wx.hideLoading();
    }
  },

  onAdd() {
    this.setData({
      isEditing: true,
      editingId: null,
      formData: {
        name: '',
        priority: 0
      }
    });
  },

  onEdit(e: any) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      isEditing: true,
      editingId: item._id || item.id,
      formData: {
        name: item.name,
        priority: item.priority || 0
      }
    });
  },

  async onDelete(e: any) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    
    const res = await wx.showModal({
      title: '确认删除',
      content: `确定要删除分类 "${name}" 吗？`,
      confirmColor: '#FF3B30'
    });
    
    if (res.confirm) {
      wx.showLoading({ title: '删除中' });
      try {
        await repositories.categories.remove(id);
        await this.loadData();
        wx.showToast({ title: '已删除', icon: 'success' });
      } catch (e) {
        wx.showToast({ title: '删除失败', icon: 'none' });
        console.error(e);
      } finally {
        wx.hideLoading();
      }
    }
  },

  onCancel() {
    this.setData({ isEditing: false });
  },

  onInputChange(e: any) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  async onSave() {
    const { name, priority } = this.data.formData;
    
    if (!name) {
      wx.showToast({ title: '请输入名称', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '保存中' });
    try {
      const input: any = {
        name,
        priority: parseInt(priority as any) || 0
      };
      
      if (this.data.editingId) {
        input.id = this.data.editingId;
      }
      
      await repositories.categories.upsert(input);
      
      this.setData({ isEditing: false });
      await this.loadData();
      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
      console.error(e);
    } finally {
      wx.hideLoading();
    }
  }
});
