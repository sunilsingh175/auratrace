import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.AURA_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MASTER_KEY = process.env.AURA_MASTER_API_KEY || "";

async function proxy(request: NextRequest, context: { params: { path: string[] } }) {
  if (!MASTER_KEY) return NextResponse.json({ detail: "AURA_MASTER_API_KEY is not configured" }, { status: 500 });
  const path = context.params.path.join("/");
  const url = `${API_URL}/api/v1/${path}${request.nextUrl.search}`;
  const headers = new Headers(request.headers);
  headers.set("X-API-Key", MASTER_KEY);
  headers.delete("host");
  headers.delete("content-length");

  const init: RequestInit = { method: request.method, headers, redirect: "follow" };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = await request.text();

  try {
    const response = await fetch(url, init);
    const body = await response.text();
    return new NextResponse(body, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") || "application/json" } });
  } catch {
    return NextResponse.json({ detail: "AuraTrace backend is unavailable" }, { status: 502 });
  }
}

export async function GET(request: NextRequest, context: { params: { path: string[] } }) { return proxy(request, context); }
export async function POST(request: NextRequest, context: { params: { path: string[] } }) { return proxy(request, context); }
export async function PATCH(request: NextRequest, context: { params: { path: string[] } }) { return proxy(request, context); }
