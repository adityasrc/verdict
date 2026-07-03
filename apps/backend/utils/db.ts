import 'dotenv/config';
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.POOL_URL; //database url

if (!connectionString) {
    throw new Error("DATABASE_URL is not set in the environment variables.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });