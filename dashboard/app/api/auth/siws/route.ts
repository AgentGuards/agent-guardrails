// TODO: Sign-In With Solana verification endpoint per §6.4
import { NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  return Response.json({ error: "Not implemented" }, { status: 501 });
}
