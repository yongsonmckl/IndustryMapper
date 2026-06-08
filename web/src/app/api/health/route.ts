import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    name: "IndustryMapper",
    status: "ok",
    scope: ["semiconductors", "oil-gas"],
    supabaseProjectRef: "uwfpjwlkypryqhfmbybj",
    timestamp: new Date().toISOString(),
  });
}
