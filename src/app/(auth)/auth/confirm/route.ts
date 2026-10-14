import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/validation.mjs";
// GET does not consume a one-use token: email scanners must not accept invitations.
export async function POST(request: NextRequest) {
  const origin = appOrigin(process.env.APP_URL || request.nextUrl.origin);
  if (request.headers.get("origin") !== origin)
    return new NextResponse(
      '<!doctype html><html lang="it"><meta charset="utf-8"><title>Conferma non riuscita</title><h1>Conferma non riuscita</h1><p>Riapri il collegamento dell’email nel browser e riprova.</p><p><a href="/login">Torna all’accesso</a></p></html>',
      {
        status: 403,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-store",
        },
      },
    );
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
      return NextResponse.redirect(new URL("/password", origin), 303);
  }
  return NextResponse.redirect(
    new URL("/login?status=expired", origin),
    303,
  );
}
