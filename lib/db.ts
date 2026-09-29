// lib/prisma.ts (or wherever you initialize your db client localy)
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    // Optional: add port if you use something other than default 3306
    port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 3306,
    connectionLimit: 5,
});

// 2. FIXED SERVERLESS POOLING: Next.js hot-reloads during local development, 
// which will spin up fresh connections every time you save a file and quickly crash MariaDB.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter,
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// import { PrismaTiDBCloud } from '@tidbcloud/prisma-adapter';
// import { PrismaClient } from "@prisma/client";

// No need to import Client or connect manually
// const adapter = new PrismaTiDBCloud({
//     url: process.env.DATABASE_URL as string
// });

// const prisma = new PrismaClient({ adapter });

// export { prisma };