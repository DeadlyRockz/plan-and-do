import { connection } from "next/server";
import { createHealthHandler } from "@/server/handlers";
import { getHandlerDeps } from "@/server/runtime";

export async function GET(): Promise<Response> {
  // Read the environment per request, not at build time.
  await connection();
  return createHealthHandler(getHandlerDeps())();
}
