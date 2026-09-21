import { NextRequest, NextResponse } from "next/server";

function getCandidateUrls(): string[] {
  const list = [
    process.env.AURA_API_URL,
    process.env.AURA_BACKEND_URL,
    process.env.INTERNAL_INGESTION_URL,
    "http://ingestion-service:8000",
    process.env.NEXT_PUBLIC_API_URL,
    "http://127.0.0.1:8000",
    "http://localhost:8000",
  ];
  return Array.from(new Set(list.filter((u): u is string => Boolean(u && u.trim()))));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, comment } = body;

    if (!email || !comment) {
      return NextResponse.json(
        { success: false, error: "Email and message are required." },
        { status: 400 }
      );
    }

    const inquiryId = `INQ-${Date.now().toString(36).toUpperCase()}`;
    const payload = {
      name: name || "",
      email: email.trim().toLowerCase(),
      phone: phone || "",
      comment: comment.trim(),
    };

    const candidateUrls = getCandidateUrls();
    let delivered = false;
    let lastError: unknown = null;

    for (const baseUrl of candidateUrls) {
      try {
        const res = await fetch(`${baseUrl}/auth/contact`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          cache: "no-store",
        });

        if (res.ok) {
          const data = await res.json();
          console.log(`[Contact Route] Successfully dispatched inquiry ${inquiryId} via ${baseUrl}`);
          delivered = true;
          break;
        } else {
          console.warn(`[Contact Route] Endpoint ${baseUrl}/auth/contact returned status ${res.status}`);
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!delivered) {
      console.warn("[Contact Route] Notice: could not reach backend ingestion for immediate dispatch:", lastError);
    }

    return NextResponse.json({
      success: true,
      inquiryId,
      message: "Your message has been submitted directly to the administrative team.",
    });
  } catch (error) {
    console.error("Error processing contact inquiry:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process contact inquiry." },
      { status: 500 }
    );
  }
}

