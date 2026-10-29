import { createIdeasHandler } from "@/server/handlers";
import { getHandlerDeps } from "@/server/runtime";

export async function POST(request: Request): Promise<Response> {
  return createIdeasHandler(getHandlerDeps())(request);
}
