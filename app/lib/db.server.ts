import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Prevent multiple instances of Prisma Client in development
declare global {
  var __db: PrismaClient | undefined;
  var __pool: pg.Pool | undefined;
}

let db: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  db = new PrismaClient({ adapter });
  db.$connect();
} else {
  if (!global.__db) {
    if (!global.__pool) {
      global.__pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    }
    const adapter = new PrismaPg(global.__pool);
    global.__db = new PrismaClient({
      adapter,
      log: ['query', 'error', 'warn'],
    });
    global.__db.$connect();
  }
  db = global.__db;
}

export { db };
