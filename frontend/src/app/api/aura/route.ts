import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.AURA_BACKEND_URL ||
  process.env.AURA_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";
const MASTER_KEY =
  process.env.AURA_MASTER_API_KEY || "aura_secret_key_123";

async function proxy(request: NextRequest) {
  if (!MASTER_KEY) {
    return NextResponse.json(
      { detail: "AURA_MASTER_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const targetPath = request.nextUrl.searchParams.get("path");
  if (!targetPath || targetPath.includes("..") || targetPath.startsWith("/")) {
    return NextResponse.json(
      { detail: "Invalid proxy path" },
      { status: 400 }
    );
  }

  const query = new URLSearchParams(request.nextUrl.searchParams);
  query.delete("path");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const url = `${API_URL}/api/v1/${targetPath}${suffix}`;

  const headers = new Headers(request.headers);
  headers.set("X-API-Key", MASTER_KEY);
  headers.delete("host");
  headers.delete("content-length");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "follow",
    cache: "no-store",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  try {
    const response = await fetch(url, init);
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        detail: "AuraTrace backend is unavailable",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
