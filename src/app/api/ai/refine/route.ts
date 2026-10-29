import { createRefineHandler } from "@/server/handlers";
import { getHandlerDeps } from "@/server/runtime";

export async function POST(request: Request): Promise<Response> {
  return createRefineHandler(getHandlerDeps())(request);
}
