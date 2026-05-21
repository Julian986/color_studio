import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

function createClientPromise(): Promise<MongoClient> {
  if (!uri) {
    return Promise.reject(
      new Error("MONGODB_URI no está definida. Creá .env.local con la cadena de conexión (ver .env.example)."),
    );
  }
  const client = new MongoClient(uri);
  return client.connect();
}

/**
 * Una sola promesa de cliente por proceso (dev y prod).
 * En Vercel/serverless evita abrir un MongoClient nuevo en cada `getDb()` y saturar Atlas.
 */
function getClientPromise(): Promise<MongoClient> {
  if (!globalForMongo._mongoClientPromise) {
    globalForMongo._mongoClientPromise = createClientPromise();
  }
  return globalForMongo._mongoClientPromise;
}

export async function getDb() {
  const client = await getClientPromise();
  const name = process.env.MONGODB_DB ?? "colorstudio_moscardini";
  return client.db(name);
}
