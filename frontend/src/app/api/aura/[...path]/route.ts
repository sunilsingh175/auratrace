import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.AURA_BACKEND_URL || process.env.AURA_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function handler(request: NextRequest, context: { params: { path: string[] } }) {
  const targetPath = `/${context.params.path.join("/")}`;
  const target = new URL(targetPath, BACKEND_URL);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value));

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  } else {
    headers.set("content-type", "application/json");
  }
  
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);

  const xApiKey = request.headers.get("x-api-key");
  if (xApiKey) headers.set("x-api-key", xApiKey);

  const xProjectKey = request.headers.get("x-project-key");
  if (xProjectKey) headers.set("x-project-key", xProjectKey);

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
      { detail: "Unable to reach Automatic Backend Detection backend.", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
