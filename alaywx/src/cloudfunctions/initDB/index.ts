// 云函数入口文件
import * as cloud from 'wx-server-sdk';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV as any
});

const db = cloud.database();

// 云函数入口函数
export async function main(event: any, context: any) {
  const collections = [
    'layers',
    'assets',
    'positions',
    'transactions',
    'signals',
    'messages',
    'categories',
    'settings',
    'users'
  ];

  const results: any[] = [];

  for (const name of collections) {
    try {
      // 尝试创建集合
      // @ts-ignore
      await db.createCollection(name);
      results.push({ name, status: 'created' });
    } catch (e: any) {
      // 忽略集合已存在的错误
      // 错误码 -502001 表示集合已存在
      if (e.errMsg && e.errMsg.includes('Collection already exists')) {
        results.push({ name, status: 'exists' });
      } else {
        // 其他错误记录下来
        console.error(`Failed to create collection ${name}:`, e);
        results.push({ name, status: 'error', error: e.errMsg });
      }
    }
  }

  return {
    results
  };
}
