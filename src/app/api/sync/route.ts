// app/api/sync/route.ts
import { NextResponse } from "next/server";
import { JiraSyncService } from "@/lib/jira-sync";

export async function POST(request: Request) {
  try {
    console.log("POST to SYNC");
    // Optional: Add authentication here
    const syncService = new JiraSyncService();
    const result = await syncService.syncBugathonData();

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Sync failed", details: error },
      { status: 500 }
    );
  }
}
