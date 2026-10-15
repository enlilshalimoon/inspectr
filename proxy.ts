import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { captureAttribution } from "@/lib/attribution";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  captureAttribution(request, response);
  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals, static assets, and image optimization.
    "/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
