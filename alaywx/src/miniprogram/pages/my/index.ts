const app = getApp();
const defaultAvatarUrl = '/assets/icon.png';

Page({
  data: {
    statusBarHeight: 20,
    openid: '',
    avatarUrl: defaultAvatarUrl,
    nickName: '微信用户'
  },

  onLoad() {
    const { statusBarHeight } = wx.getWindowInfo();
    this.setData({ statusBarHeight });
    
    // Load saved user info
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      let avatarUrl = userInfo.avatarUrl;
      // Check if it's the old network default or invalid, replace with new local default
      if (!avatarUrl || avatarUrl.includes('mmbiz.qpic.cn')) {
        avatarUrl = defaultAvatarUrl;
      }
      
      this.setData({
        avatarUrl: avatarUrl,
        nickName: userInfo.nickName || '微信用户'
      });
    }
  },

  onShow() {
    if (app.globalData.openid) {
      this.setData({ openid: app.globalData.openid });
    }
  },
  
  onChooseAvatar(e: any) {
    const { avatarUrl } = e.detail;
    this.setData({ avatarUrl });
    this.saveUserInfo();
  },

  onInputChange(e: any) {
    const nickName = e.detail.value;
    this.setData({ nickName });
    this.saveUserInfo();
  },
  
  onTapTools(e: any) {
    const page = e.currentTarget.dataset.page;
    let url = '';
    
    switch (page) {
      case 'MyLayerTools':
        url = '/pages/my/layer-tools/index';
        break;
      case 'MyCategories':
        url = '/pages/my/categories/index';
        break;
      case 'MyMessageTools':
        url = '/pages/my/messages/index';
        break;
      case 'MyTemplatesData':
        url = '/pages/my/data/index';
        break;
    }
    
    if (url) {
      wx.navigateTo({ url });
    } else {
      wx.showToast({ title: '功能开发中', icon: 'none' });
    }
  },

  saveUserInfo() {
    const { avatarUrl, nickName } = this.data;
    // Only save if it's not the default
    if (avatarUrl === defaultAvatarUrl) {
      wx.setStorageSync('userInfo', { nickName });
    } else {
      wx.setStorageSync('userInfo', { avatarUrl, nickName });
    }
  }
});
