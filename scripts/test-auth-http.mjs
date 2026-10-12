import assert from "node:assert/strict";

// Run against a local build; no real token, account or backend is required.
const origin = new URL(process.argv[2] || "http://127.0.0.1:3000").origin;
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
const page = await fetch(`${origin}/auth/accept?token_hash=test&type=invite`);
assert.equal(page.status, 200);
assert.equal(page.headers.get("referrer-policy"), "strict-origin");
assert.match(await page.text(), /action="\/auth\/confirm"/);

// Studio invitations issued before the template fix must reach confirmation,
// without verifying a token on GET or honoring arbitrary redirect targets.
for (const type of ["invite", "recovery"]) {
  const params = new URLSearchParams({ token_hash: "test+/=", type });
  const response = await fetch(`${origin}/?${params}&next=https://foreign.example`, {
    redirect: "manual",
  });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), `/auth/accept?${params}`);
}
for (const query of [
  "", "token_hash=test&type=other", "token_hash=&type=invite",
  "token_hash=a&token_hash=b&type=invite", "token_hash=a&type=invite&type=recovery",
  `token_hash=${"a".repeat(513)}&type=invite`,
]) {
  const response = await fetch(`${origin}/?${query}`, { redirect: "manual" });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "/account");
}

for (const suppliedOrigin of [null, "null", "https://foreign.example"]) {
  const headers = suppliedOrigin === null ? {} : { Origin: suppliedOrigin };
  const response = await fetch(`${origin}/auth/confirm`, {
    method: "POST",
    headers,
    body: new URLSearchParams({ type: "invite", token_hash: "" }),
    redirect: "manual",
  });
  assert.equal(response.status, 403);
  assert.match(response.headers.get("content-type"), /^text\/html/);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.match(await response.text(), /Conferma non riuscita/);
}

for (const type of ["invite", "recovery"]) {
  const response = await fetch(`${origin}/auth/confirm`, {
    method: "POST",
    headers: { Origin: origin },
    body: new URLSearchParams({ type, token_hash: "" }),
    redirect: "manual",
  });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), `${origin}/login?status=expired`);
}
console.log("Auth HTTP: policy, origin rejection, legacy invitations and safe redirects passed.");
