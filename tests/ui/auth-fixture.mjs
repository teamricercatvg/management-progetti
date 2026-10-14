// Local UI contract fixture only. This does not validate Supabase security/RLS.
import { createServer } from "node:http";
const id = "00000000-0000-4000-8000-000000000006";
function session(role) {
  const user = {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: `${role}@example.test`,
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const payload = {
    sub: id,
    aud: "authenticated",
    role: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600,
    fixture_role: role,
  };
  const access_token = [
    Buffer.from('{"alg":"HS256"}').toString("base64url"),
    Buffer.from(JSON.stringify(payload)).toString("base64url"),
    "fixture",
  ].join(".");
  return {
    access_token,
    refresh_token: "fixture-refresh",
    token_type: "bearer",
    expires_in: 3600,
    user,
  };
}
createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  let role;
  try {
    role = JSON.parse(
      Buffer.from(req.headers.authorization.split(".")[1], "base64url"),
    ).fixture_role;
  } catch {}
  if (req.url.startsWith("/auth/v1/token")) {
    let body = "";
    for await (const chunk of req) body += chunk;
    const { email } = JSON.parse(body);
    const requested = email?.split("@")[0];
    if (!["admin", "manager", "unassigned", "inactive"].includes(requested)) {
      res.statusCode = 400;
      return res.end("{}");
    }
    return res.end(JSON.stringify(session(requested)));
  }
  if (req.url === "/auth/v1/user") {
    if (!role) {
      res.statusCode = 401;
      return res.end("{}");
    }
    return res.end(JSON.stringify(session(role).user));
  }
  if (req.url === "/rest/v1/rpc/current_profile")
    return res.end(
      JSON.stringify(
        role && role !== "inactive"
          ? [
              {
                id,
                display_name: `Profilo ${role}`,
                is_admin: role === "admin",
              },
            ]
          : [],
      ),
    );
  if (req.url === "/auth/v1/logout?scope=local") {
    res.statusCode = 204;
    return res.end();
  }
  if (req.url === "/") return res.end("{}");
  res.statusCode = 404;
  res.end("{}");
}).listen(54329, "127.0.0.1");
