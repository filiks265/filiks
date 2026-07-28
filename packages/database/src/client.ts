import dotenv from "dotenv";
import path from "path";
import dns from "node:dns";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

dotenv.config({
    path: path.resolve(import.meta.dirname, "../../../.env"),
});

dotenv.config({
    path: path.resolve(import.meta.dirname, "../../../.env.local"),
    override: true,
});

let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

// Resolve hostname to IPv4 to avoid IPv6 timeout with Neon pooler
try {
  const url = new URL(databaseUrl);
  const hostname = url.hostname;
  const ip = await new Promise<string>((resolve, reject) => {
    dns.resolve4(hostname, (err, addresses) => {
      if (err) {
        reject(err);
      } else if (addresses?.[0]) {
        resolve(addresses[0]);
      } else {
        reject(new Error(`No IPv4 addresses found for ${hostname}`));
      }
    });
  });

  // Neon pooler needs endpoint ID when connecting via IP
  const endpointId = (hostname.split(".")[0] ?? "").replace("-pooler", "");

  url.hostname = ip;
  url.searchParams.set("sslmode", "no-verify");
  url.searchParams.set("options", `endpoint=${endpointId}`);
  databaseUrl = url.toString();
} catch (err) {
  console.warn("[DB] Hostname resolution failed, using original URL:", err);
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 30_000,
});

export const db = new PrismaClient({ adapter });