const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Prevent multiple instances in development (hot reload)
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: [
    { level: 'query',  emit: 'event' },
    { level: 'error',  emit: 'stdout' },
    { level: 'warn',   emit: 'stdout' },
  ],
});

// Log slow queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    if (e.duration > 2000) {
      logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
    }
  });
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;