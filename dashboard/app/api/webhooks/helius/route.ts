// TODO: Helius webhook receiver (alternative to standalone worker)
import { NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  return Response.json({ error: "Not implemented" }, { status: 501 });
}
