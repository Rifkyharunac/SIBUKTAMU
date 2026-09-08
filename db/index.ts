import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Binding database DB belum tersedia. Periksa konfigurasi D1 dalam wrangler.json."
    );
  }

  return drizzle(env.DB, { schema });
}
