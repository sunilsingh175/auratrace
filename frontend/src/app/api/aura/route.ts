import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.AURA_BACKEND_URL ||
  process.env.AURA_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

async function proxy(request: NextRequest) {
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

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  } else {
    headers.set("Content-Type", "application/json");
  }

  // Forward client authentication headers (JWT Bearer token or custom project keys)
  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers.set("Authorization", authorization);
  }

  const xApiKey = request.headers.get("x-api-key");
  if (xApiKey) {
    headers.set("X-API-Key", xApiKey);
  }

  const xProjectKey = request.headers.get("x-project-key");
  if (xProjectKey) {
    headers.set("X-Project-Key", xProjectKey);
  }

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
        detail: "Trace backend is unavailable",
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
