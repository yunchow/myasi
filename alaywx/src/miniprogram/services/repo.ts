import { db, layers, assets, positions, signals, messages, categories, settings, transactions, users,
  Layer, Asset, Position, Signal, Message, Transaction, User, Category, Setting
} from './db';
import { createId } from '../utils/id';

// Helper to get all records (handling limit of 20)
async function getAll<T>(collection: any, where: object = {}, orderByField: string | null = null, orderByType: 'asc' | 'desc' = 'asc'): Promise<T[]> {
  const MAX_LIMIT = 20;
  const countResult = await collection.where(where).count();
  const total = countResult.total;
  const batchTimes = Math.ceil(total / MAX_LIMIT);
  const tasks: Promise<any>[] = [];
  
  for (let i = 0; i < batchTimes; i++) {
    let query = collection.where(where).skip(i * MAX_LIMIT).limit(MAX_LIMIT);
    if (orderByField) {
      query = query.orderBy(orderByField, orderByType);
    }
    tasks.push(query.get());
  }
  
  if (tasks.length === 0) return [];
  
  const results = await Promise.all(tasks);
  return results.reduce((acc, cur) => acc.concat(cur.data), [] as T[]);
}

export const repositories = {
  layers: {
    list: async (): Promise<Layer[]> => {
      const res = await getAll<Layer>(layers, {}, 'orderIndex', 'asc');
      return res;
    },
    get: async (layerId: string): Promise<Layer | null> => {
      try {
        const res = await layers.doc(layerId).get();
        return res.data as Layer;
      } catch (e) {
        return null;
      }
    },
    upsert: async (input: any): Promise<string> => {
      const now = Date.now();
      if (input.id) {
        await layers.doc(input.id).update({
          data: {
            name: input.name,
            orderIndex: input.orderIndex, // Allow updating order
            currency: input.currency || 'USD', // Default to USD if not specified
            targetProfitPct: input.targetProfitPct,
            targetLossPct: input.targetLossPct,
            keyMetric: input.keyMetric,
            updatedAt: now
          }
        });
        return input.id;
      }
      
      const id = createId('layer');
      // If orderIndex is not provided, append to end
      let orderIndex = input.orderIndex;
      if (orderIndex === undefined || orderIndex === null) {
        const allLayers = await getAll<Layer>(layers);
        const maxOrder = allLayers.reduce((max, l) => Math.max(max, l.orderIndex || 0), -1);
        orderIndex = maxOrder + 1;
      }
      
      await layers.add({
        data: {
          _id: id,
          id: id,
          name: input.name,
          orderIndex,
          currency: input.currency || 'USD', // Default to USD
          targetProfitPct: input.targetProfitPct,
          targetLossPct: input.targetLossPct,
          keyMetric: input.keyMetric,
          createdAt: now,
          updatedAt: now
        }
      });
      return id;
    },
    remove: async (layerId: string) => {
      await layers.doc(layerId).remove();
    }
    // move: TODO implemented later if needed
  },
  
  assets: {
    list: async (): Promise<Asset[]> => {
      const res = await getAll<Asset>(assets, {}, 'symbol', 'asc');
      return res;
    },
    get: async (assetId: string): Promise<Asset | null> => {
      try {
        const res = await assets.doc(assetId).get();
        return res.data as Asset;
      } catch (e) {
        return null;
      }
    },
    getOrCreateBySymbol: async (input: any): Promise<Asset> => {
      // Check if exists
      const existing = await assets.where({ symbol: input.symbol }).get();
      if (existing.data.length > 0) {
        return existing.data[0] as Asset;
      }
      
      const now = Date.now();
      const id = createId('asset');
      const data: Asset = {
        _id: id,
        id: id,
        symbol: input.symbol,
        name: input.name,
        type: input.type,
        currency: input.currency,
        createdAt: now,
        updatedAt: now
      };
      
      await assets.add({ data });
      return data;
    }
  },
  
  positions: {
    listByLayer: async (layerId: string): Promise<Position[]> => {
      const res = await getAll<Position>(positions, { layerId }, 'updatedAt', 'desc');
      return res;
    },
    get: async (positionId: string): Promise<Position | null> => {
      try {
        const res = await positions.doc(positionId).get();
        return res.data as Position;
      } catch (e) {
        return null;
      }
    },
    listWithAssets: async (): Promise<{ position: Position, asset: Asset | null }[]> => {
      // Cloud DB doesn't support JOINs easily. 
      // We need to fetch positions and assets separately and join manually.
      const allPositions = await getAll<Position>(positions);
      const allAssets = await getAll<Asset>(assets);
      const assetMap = new Map(allAssets.map(a => [a.id, a]));
      
      return allPositions.map(p => ({
        position: p,
        asset: assetMap.get(p.assetId) || null
      })).filter(item => item.asset !== null);
    },
    upsert: async (input: any): Promise<string> => {
      const now = Date.now();
      // Ensure asset exists
      let assetId: string | null = null;
      if (input.asset) {
        const asset = await repositories.assets.getOrCreateBySymbol(input.asset);
        assetId = asset.id;
      }
      
      if (input.id) {
        const data: any = {
          layerId: input.layerId,
          quantity: input.quantity,
          costTotal: input.costTotal,
          manualPrice: input.manualPrice,
          updatedAt: now
        };
        if (assetId) data.assetId = assetId;
        
        await positions.doc(input.id).update({ data });
        return input.id;
      }
      
      const id = createId('pos');
      await positions.add({
        data: {
          _id: id,
          id: id,
          layerId: input.layerId,
          assetId: assetId,
          quantity: input.quantity,
          costTotal: input.costTotal,
          manualPrice: input.manualPrice,
          createdAt: now,
          updatedAt: now
        }
      });
      return id;
    },
    remove: async (positionId: string) => {
      await positions.doc(positionId).remove();
    }
  },
  
  signals: {
    list: async (filter: object = {}): Promise<Signal[]> => {
      // Filter by layerId or positionId if provided
      const res = await getAll<Signal>(signals, filter, 'updatedAt', 'desc');
      return res;
    },
    get: async (signalId: string): Promise<Signal | null> => {
      try {
        const res = await signals.doc(signalId).get();
        return res.data as Signal;
      } catch (e) {
        return null;
      }
    },
    upsert: async (input: any): Promise<string> => {
      const now = Date.now();
      if (input.id) {
        await signals.doc(input.id).update({
          data: {
            layerId: input.layerId,
            positionId: input.positionId,
            trigger: input.trigger,
            thresholdPct: input.thresholdPct,
            enabled: input.enabled,
            titleTemplate: input.titleTemplate,
            bodyTemplate: input.bodyTemplate,
            updatedAt: now
          }
        });
        return input.id;
      }
      
      const id = createId('sig');
      await signals.add({
        data: {
          _id: id,
          id: id,
          layerId: input.layerId,
          positionId: input.positionId,
          trigger: input.trigger,
          thresholdPct: input.thresholdPct,
          enabled: input.enabled,
          titleTemplate: input.titleTemplate,
          bodyTemplate: input.bodyTemplate,
          createdAt: now,
          updatedAt: now
        }
      });
      return id;
    },
    remove: async (signalId: string) => {
      await signals.doc(signalId).remove();
    }
  },
  
  messages: {
    list: async (where: object = {}): Promise<Message[]> => {
      const res = await getAll<Message>(messages, where, 'createdAt', 'desc');
      return res;
    },
    create: async (input: any): Promise<string> => {
      const id = createId('msg');
      await messages.add({
        data: {
          _id: id,
          id: id,
          createdAt: Date.now(),
          layerId: input.layerId,
          positionId: input.positionId,
          title: input.title,
          body: input.body, // Rich text (HTML/Markdown) or summary
          bodyRaw: input.bodyRaw, // Full rich text content if needed separately
          level: input.level,
          authorName: input.authorName || 'System',
          authorAvatar: input.authorAvatar || '/assets/icon.png',
          readAt: null
        }
      });
      return id;
    },
    markAllRead: async () => {
      const unread = await messages.where({ readAt: null }).get();
      const batch: Promise<any>[] = [];
      const now = Date.now();
      for (const msg of unread.data) {
        if (msg._id) {
          batch.push(messages.doc(msg._id).update({ data: { readAt: now } }));
        }
      }
      await Promise.all(batch);
    }
  },

  transactions: {
    listByPosition: async (positionId: string): Promise<Transaction[]> => {
      const res = await getAll<Transaction>(transactions, { positionId }, 'createdAt', 'desc');
      return res;
    },
    add: async (input: any): Promise<string> => {
      // input: { positionId, type: 'buy'|'sell'|'transfer', quantity, price, fee, note }
      const id = createId('tx');
      const now = Date.now();
      await transactions.add({
        data: {
          _id: id,
          id: id,
          positionId: input.positionId,
          type: input.type,
          quantity: input.quantity,
          price: input.price,
          fee: input.fee || 0,
          note: input.note || '',
          createdAt: now,
          updatedAt: now
        }
      });
      return id;
    }
  },

  users: {
    get: async (): Promise<User | null> => {
      const res = await users.get();
      if (res.data.length > 0) {
        return res.data[0] as User;
      }
      return null;
    },
    update: async (input: any) => {
      const user = await repositories.users.get();
      const now = Date.now();
      if (user && user._id) {
        await users.doc(user._id).update({
          data: {
            ...input,
            updatedAt: now
          }
        });
      } else {
        const id = createId('usr');
        await users.add({
          data: {
            _id: id,
            id: id,
            ...input,
            createdAt: now,
            updatedAt: now
          }
        });
      }
    }
  },

  categories: {
    list: async (): Promise<Category[]> => {
      const res = await getAll<Category>(categories, {}, 'priority', 'asc'); // Order by priority
      return res;
    },
    get: async (id: string): Promise<Category | null> => {
      try {
        const res = await categories.doc(id).get();
        return res.data as Category;
      } catch (e) {
        return null;
      }
    },
    upsert: async (input: any): Promise<string> => {
      const now = Date.now();
      if (input.id) {
        await categories.doc(input.id).update({
          data: {
            name: input.name,
            priority: input.priority || 0,
            updatedAt: now
          }
        });
        return input.id;
      }
      
      const id = createId('cat');
      await categories.add({
        data: {
          _id: id,
          id: id,
          name: input.name,
          priority: input.priority || 0,
          createdAt: now,
          updatedAt: now
        }
      });
      return id;
    },
    remove: async (id: string) => {
      await categories.doc(id).remove();
    }
  },

  settings: {
    get: async (): Promise<Setting | null> => {
      const res = await settings.get();
      if (res.data.length > 0) {
        return res.data[0] as Setting;
      }
      return null;
    },
    upsert: async (input: any): Promise<string> => {
      const res = await settings.get();
      const item = res.data.length > 0 ? res.data[0] : null;
      const now = Date.now();
      if (item && item._id) {
        await settings.doc(item._id).update({
          data: {
            ...input,
            updatedAt: now
          }
        });
        return item.id;
      } else {
        const id = createId('set');
        await settings.add({
          data: {
            _id: id,
            id: id,
            ...input,
            createdAt: now,
            updatedAt: now
          }
        });
        return id;
      }
    }
  }
};
