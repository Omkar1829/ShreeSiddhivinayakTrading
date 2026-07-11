const { PrismaClient } = require('@prisma/client');
const als = require('./als');

const prismaClient = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Models that support soft deletes
const SOFT_DELETE_MODELS = [
  'User',
  'Address',
  'Category',
  'Subcategory',
  'Brand',
  'Product',
  'Variant',
  'Order',
  'OrderItem'
];

// Helper to convert model name to camelCase property name of Prisma Client
const getModelKey = (modelName) => {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
};

const prisma = prismaClient.$extends({
  query: {
    $allModels: {
      async findMany({ model, operation, args, query }) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          args.where = args.where || {};
          if (args.where.deletedAt === undefined) {
            args.where.deletedAt = null;
          }
        }
        return query(args);
      },
      async findFirst({ model, operation, args, query }) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          args.where = args.where || {};
          if (args.where.deletedAt === undefined) {
            args.where.deletedAt = null;
          }
        }
        return query(args);
      },
      async findUnique({ model, operation, args, query }) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          args.where = args.where || {};
          if (args.where.deletedAt === undefined) {
            args.where.deletedAt = null;
          }
          // Redirect findUnique to findFirst to allow filtering by non-unique 'deletedAt'
          const modelKey = getModelKey(model);
          return prismaClient[modelKey].findFirst(args);
        }
        return query(args);
      },
      async count({ model, operation, args, query }) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          args.where = args.where || {};
          if (args.where.deletedAt === undefined) {
            args.where.deletedAt = null;
          }
        }
        return query(args);
      },
      async aggregate({ model, operation, args, query }) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          args.where = args.where || {};
          if (args.where.deletedAt === undefined) {
            args.where.deletedAt = null;
          }
        }
        return query(args);
      },
      async groupBy({ model, operation, args, query }) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          args.where = args.where || {};
          if (args.where.deletedAt === undefined) {
            args.where.deletedAt = null;
          }
        }
        return query(args);
      },
      async create({ model, operation, args, query }) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          const store = als.getStore();
          if (store && store.userId) {
            args.data = args.data || {};
            args.data.createdBy = store.userId;
            args.data.updatedBy = store.userId;
          }
        }
        return query(args);
      },
      async createMany({ model, operation, args, query }) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          const store = als.getStore();
          if (store && store.userId) {
            if (Array.isArray(args.data)) {
              args.data.forEach(item => {
                item.createdBy = store.userId;
                item.updatedBy = store.userId;
              });
            } else if (args.data) {
              args.data.createdBy = store.userId;
              args.data.updatedBy = store.userId;
            }
          }
        }
        return query(args);
      },
      async update({ model, operation, args, query }) {
        if (SOFT_DELETE_MODELS.includes(model) || model === 'StoreSetting') {
          const store = als.getStore();
          if (store && store.userId) {
            args.data = args.data || {};
            args.data.updatedBy = store.userId;
          }
        }
        return query(args);
      },
      async updateMany({ model, operation, args, query }) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          const store = als.getStore();
          if (store && store.userId) {
            args.data = args.data || {};
            args.data.updatedBy = store.userId;
          }
        }
        return query(args);
      },
      async upsert({ model, operation, args, query }) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          const store = als.getStore();
          if (store && store.userId) {
            args.create = args.create || {};
            args.create.createdBy = store.userId;
            args.create.updatedBy = store.userId;

            args.update = args.update || {};
            args.update.updatedBy = store.userId;
          }
        }
        return query(args);
      }
    }
  }
});

module.exports = prisma;
