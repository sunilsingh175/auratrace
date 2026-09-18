import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.AURA_BACKEND_URL || process.env.AURA_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MASTER_API_KEY = process.env.AURA_MASTER_API_KEY || "aura_secret_key_123";

async function handler(request: NextRequest, context: { params: { path: string[] } }) {
  if (!MASTER_API_KEY) {
    return NextResponse.json({ detail: "AuraTrace server API key is not configured." }, { status: 500 });
  }

  const targetPath = `/${context.params.path.join("/")}`;
  const target = new URL(targetPath, BACKEND_URL);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value));

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("X-API-Key", MASTER_API_KEY);

  let body: BodyInit | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();
  }

  try {
    const upstream = await fetch(target, { method: request.method, headers, body, cache: "no-store" });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
    });
  } catch (error) {
    return NextResponse.json(
      { detail: "Unable to reach AuraTrace backend.", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
