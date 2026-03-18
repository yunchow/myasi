import { repositories } from '../../services/repo';
import { messages } from '../../services/db';

function formatTime(ts: number): string {
  const now = new Date();
  const d = new Date(ts);
  
  const isToday = now.toDateString() === d.toDateString();
                 
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = yesterday.getDate() === d.getDate() && 
                     yesterday.getMonth() === d.getMonth() && 
                     yesterday.getFullYear() === d.getFullYear();

  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');

  if (isToday) {
    return `${hh}:${mm}`;
  } else if (isYesterday) {
    return `昨天 ${hh}:${mm}`;
  } else {
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}月${day}日`;
  }
}

Page({
  data: {
    statusBarHeight: 20,
    conversations: [] as any[],
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
      let list = await repositories.messages.list();
      
      // If empty, generate test data
      if (list.length === 0) {
        await this.generateTestData();
        list = await repositories.messages.list();
      }

      // Group by authorName (simulating conversation ID)
      const groups = new Map<string, any>();
      
      list.forEach((msg: any) => {
        const key = msg.authorName || 'System';
        if (!groups.has(key)) {
          groups.set(key, {
            id: key,
            name: key,
            avatar: msg.authorAvatar || '/assets/icon.png', // Default icon
            messages: [],
            unreadCount: 0
          });
        }
        const group = groups.get(key);
        group.messages.push(msg);
        if (!msg.readAt) {
          group.unreadCount++;
        }
      });

      // Process groups into displayable conversations
      const conversations = Array.from(groups.values()).map(group => {
        // Sort messages in group by time desc to get latest
        group.messages.sort((a: any, b: any) => b.createdAt - a.createdAt);
        const latest = group.messages[0];
        
        // Handle special preview text like "[5条通知]"
        let preview = latest.body;
        // If unread count > 1, maybe show count in preview? 
        // The screenshot shows "[5条通知] ..." for one item. 
        // We can simulate this if we had specific types, but for now just use body.
        
        return {
          id: group.id,
          name: group.name,
          avatar: group.avatar,
          preview: preview,
          timeStr: formatTime(latest.createdAt),
          timestamp: latest.createdAt,
          unreadCount: group.unreadCount,
          // Custom properties for specific styling if needed, derived from name/content
          isOfficial: group.name === '公众号' || group.name === '服务号'
        };
      });

      // Sort conversations by latest message time
      conversations.sort((a, b) => b.timestamp - a.timestamp);

      this.setData({ conversations, refreshing: false });
    } catch (e) {
      console.error(e);
      this.setData({ refreshing: false });
    }
  },

  async generateTestData() {
    const now = Date.now();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    const testMessages = [
      {
        authorName: '公众号',
        authorAvatar: '/assets/icon_gzh.png', // We might not have these assets, will use placeholder logic in WXML or generic
        title: '杭州发布',
        body: '[5条通知] 杭州发布：“全球超市”来了！3月15...',
        createdAt: now - 10 * minute, // 08:53 equivalent if now is morning
        readAt: null // Unread
      },
      {
        authorName: '服务号',
        authorAvatar: '/assets/icon_fwh.png',
        title: '博卡会员通',
        body: '博卡会员通：洗出健康， 护出靓丽',
        createdAt: now - day - (2 * hour), // Yesterday 17:01
        readAt: 1 // Read
      },
      {
        authorName: '老婆&宝贝',
        authorAvatar: '/assets/avatar_wife.png',
        title: '老婆&宝贝',
        body: '千岛湖',
        createdAt: now - day - (2.1 * hour), // Yesterday 16:58
        readAt: 1
      },
      {
        authorName: '服务通知',
        authorAvatar: '/assets/icon_notice.png',
        title: '服务通知',
        body: '公众平台安全助手：小程序小狐狸账号备案通过...',
        createdAt: now - day - (5 * hour), // Yesterday 14:43
        readAt: 1
      },
      {
        authorName: '烟 明',
        authorAvatar: '/assets/avatar_ym.png',
        title: '烟 明',
        body: '兄弟您好！ 打扰你了请问你目前香烟有需要吗',
        createdAt: now - day - (6 * hour), // Yesterday 13:19
        readAt: 1
      },
      {
        authorName: '异空',
        authorAvatar: '/assets/avatar_yk.png',
        title: '异空',
        body: '[图片]',
        createdAt: now - day - (9 * hour), // Yesterday 10:10
        readAt: 1
      }
    ];

    for (const msg of testMessages) {
      const id = await repositories.messages.create({
        layerId: null,
        positionId: null,
        title: msg.title,
        body: msg.body,
        level: 'info',
        authorName: msg.authorName,
        authorAvatar: msg.authorAvatar
      });
      
      // Update timestamps to match test data requirements
      if (id) {
         // Use db collection directly to update system fields
         await messages.doc(id).update({
           data: {
             createdAt: msg.createdAt,
             readAt: msg.readAt === 1 ? Date.now() : null
           }
         });
      }
    }
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadData();
  },

  onTapConversation(e: any) {
    const name = e.currentTarget.dataset.name;
    wx.navigateTo({
      url: `/pages/messages/detail/index?authorName=${name}`
    });
  }
});
