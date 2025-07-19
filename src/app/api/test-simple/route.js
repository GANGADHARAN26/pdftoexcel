import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    console.log("Simple POST test started");

    const formData = await request.formData();
    console.log("FormData parsed");

    const sessionId = formData.get("sessionId");
    console.log("SessionId:", sessionId);

    return NextResponse.json({
      success: true,
      message: "Simple POST test successful",
      sessionId: sessionId,
    });
  } catch (error) {
    console.error("Simple POST error:", error);
    return NextResponse.json(
      { error: "Simple POST failed", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Simple test API",
    status: "working",
  });
}
