// lib/prisma.ts (or wherever you initialize your db client localy)

import { PrismaTiDBCloud } from '@tidbcloud/prisma-adapter';
import { PrismaClient } from "@prisma/client";

// No need to import Client or connect manually
const adapter = new PrismaTiDBCloud({
    url: process.env.DATABASE_URL as string
});

const prisma = new PrismaClient({ adapter });

export { prisma };