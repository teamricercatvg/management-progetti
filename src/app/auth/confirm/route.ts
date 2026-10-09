import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
// GET does not consume a one-use token: email scanners must not accept invitations.
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return new NextResponse(null, { status: 403 });
  const form = await request.formData();
  const token_hash = String(form.get("token_hash") ?? "");
  const type = String(form.get("type") ?? "");
  if (token_hash && ["invite", "recovery"].includes(type)) {
    const client = await createClient();
    const { error } = await client.auth.verifyOtp({
      token_hash,
      type: type as "invite" | "recovery",
    });
    if (!error)
      return NextResponse.redirect(new URL("/password", request.url), 303);
  }
  return NextResponse.redirect(
    new URL("/login?status=expired", request.url),
    303,
  );
}
