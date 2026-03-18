export const db = wx.cloud.database()

export const layers = db.collection('layers')
export const assets = db.collection('assets')
export const positions = db.collection('positions')
export const signals = db.collection('signals')
export const messages = db.collection('messages')
export const categories = db.collection('categories')
export const settings = db.collection('settings')
export const transactions = db.collection('transactions')
export const users = db.collection('users')

/**
 * 基础数据模型，包含所有记录共有的 ID 和时间戳字段
 */
export interface BaseModel {
  _id: string;
  id: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 投资分层模型，用于将资产划分到不同的投资组合或策略层级中
 */
export interface Layer extends BaseModel {
  name: string;
  orderIndex: number;
  currency: string;
  targetProfitPct?: number;
  targetLossPct?: number;
  keyMetric?: string;
}

/**
 * 资产模型，定义了具体的金融标的（如股票、基金、加密货币）及其基本属性
 */
export interface Asset extends BaseModel {
  symbol: string;
  name: string;
  type: string;
  currency: string;
}

/**
 * 持仓模型，记录在特定分层下的资产持有数量、成本和当前状态
 */
export interface Position extends BaseModel {
  layerId: string;
  assetId: string;
  quantity: number;
  costTotal: number;
  manualPrice?: number;
}

/**
 * 信号模型，定义了触发通知或操作的条件（如止盈止损阈值）
 */
export interface Signal extends BaseModel {
  layerId: string;
  positionId: string;
  trigger: string;
  thresholdPct: number;
  enabled: boolean;
  titleTemplate: string;
  bodyTemplate: string;
}

/**
 * 消息模型，用于存储系统生成的通知、提醒或日志信息
 */
export interface Message extends BaseModel {
  layerId: string;
  positionId: string;
  title: string;
  body: string;
  bodyRaw?: string;
  level: string;
  authorName: string;
  authorAvatar: string;
  readAt?: number | null;
}

/**
 * 交易记录模型，详细记录了买入、卖出或转移等资金变动操作
 */
export interface Transaction extends BaseModel {
  positionId: string;
  type: 'buy' | 'sell' | 'transfer';
  quantity: number;
  price: number;
  fee: number;
  note: string;
}

/**
 * 分类模型，用于对资产或内容进行分组管理
 */
export interface Category extends BaseModel {
  name: string;
  priority: number;
}

/**
 * 用户模型，存储用户的基本信息和偏好设置
 */
export interface User extends BaseModel {
  [key: string]: any;
}

/**
 * 设置模型，存储全局或特定功能的配置参数
 */
export interface Setting extends BaseModel {
  [key: string]: any;
}

export default {
  db,
  layers,
  assets,
  positions,
  signals,
  messages,
  categories,
  settings,
  transactions,
  users
}
