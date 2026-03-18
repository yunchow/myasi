import { repositories } from '../../../services/repo';

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
    authorName: '',
    messages: [] as any[],
    loading: true
  },

  onLoad(options: any) {
    const authorName = options.authorName || options.title; // Support both just in case
    if (authorName) {
      this.setData({ authorName });
      wx.setNavigationBarTitle({ title: authorName });
      this.loadMessages(authorName);
    }
  },

  async loadMessages(authorName: string) {
    try {
      this.setData({ loading: true });
      // Use the new filtering capability in repo
      const list = await repositories.messages.list({ authorName });
      
      const messages = list.map((msg: any, index: number) => {
        return {
          ...msg,
          timeStr: formatTime(msg.createdAt),
          // For demo, we use body as the main title since in test data titles are just "Author Name" or simple.
          // In real world, title would be the article title.
          displayTitle: msg.body.length > 50 ? msg.body.substring(0, 50) + '...' : msg.body,
          // Randomly assign a type for display variation
          displayType: index % 2 === 0 ? 'multi' : 'single',
          showTag: index % 3 === 0
        };
      });

      this.setData({ messages, loading: false });
    } catch (e) {
      console.error(e);
      this.setData({ loading: false });
    }
  },
  
  onTapMessage(e: any) {
    // const id = e.currentTarget.dataset.id;
    // Navigate to article content if we had one
  }
});
