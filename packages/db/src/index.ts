import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!dbInstance) {
    client = postgres(connectionString, { prepare: false });
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

export type DbClient = ReturnType<typeof getDb>;
export * from './schema';
export {
  reserveJobMaterials,
  consumeJobMaterials,
  releaseJobMaterials,
  getLowStockItems,
  ensureOrganization,
  ensureUser,
} from './services/inventory';
