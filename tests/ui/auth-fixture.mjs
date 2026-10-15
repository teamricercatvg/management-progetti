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
const projects = new Map();
const associations = [];
let failProjectReads = false;
const entity = {
  id: "00000000-0000-4000-8000-000000000010",
  code: "ORG",
  name: "Ente di prova",
};
const seedId = "00000000-0000-4000-8000-000000000007";
const otherId = "00000000-0000-4000-8000-000000000008";
function resetProjects() {
  failProjectReads = false;
  projects.clear();
  associations.length = 0;
  for (const [projectId, code, title] of [
    [seedId, "DEMO", "Progetto dimostrativo"],
    [otherId, "OTHER", "Progetto riservato"],
  ])
    projects.set(projectId, {
      id: projectId,
      code,
      title,
      status: "draft",
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      currency_code: "EUR",
      description: "Descrizione del progetto",
      donor: null,
      notes: null,
      row_version: 1,
    });
}
resetProjects();
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
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/fixture/reset") {
    resetProjects();
    if (url.searchParams.get("scenario") === "pagination") {
      const template = projects.get(seedId);
      projects.clear();
      for (let index = 1; index <= 25; index++) {
        const suffix = String(index).padStart(3, "0");
        const projectId = `00000000-0000-4000-8001-${String(index).padStart(12, "0")}`;
        projects.set(projectId, { ...template, id: projectId, code: `PAGE-${suffix}`, title: `Collaudo pagina ${suffix}` });
      }
    }
    failProjectReads = url.searchParams.get("scenario") === "error";
    return res.end("{}");
  }
  if (url.pathname === "/rest/v1/projects") {
    if (req.method === "GET" && failProjectReads) {
      res.statusCode = 503;
      return res.end(JSON.stringify({ code: "fixture_unavailable", message: "Synthetic backend failure" }));
    }
    const visible = (p) =>
      role === "admin" || (role === "manager" && p.id === seedId);
    let rows = [...projects.values()].filter(visible);
    for (const key of ["id", "status", "row_version"]) {
      const filter = url.searchParams.get(key);
      if (filter?.startsWith("eq."))
        rows = rows.filter((p) => String(p[key]) === filter.slice(3));
      if (filter?.startsWith("neq."))
        rows = rows.filter((p) => String(p[key]) !== filter.slice(4));
    }
    if (req.method === "POST" || req.method === "PATCH") {
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw);
      if (req.method === "POST") {
        if (role !== "admin") {
          res.statusCode = 403;
          return res.end(JSON.stringify({ code: "42501" }));
        }
        if ([...projects.values()].some((p) => p.code === body.code)) {
          res.statusCode = 409;
          return res.end(JSON.stringify({ code: "23505" }));
        }
        const project = {
          ...body,
          id: "00000000-0000-4000-8000-000000000009",
          row_version: 1,
        };
        projects.set(project.id, project);
        rows = [project];
      } else {
        rows = rows.map((p) => ({
          ...p,
          ...body,
          row_version: p.row_version + 1,
        }));
        for (const p of rows) projects.set(p.id, p);
      }
    }
    const filter = url.searchParams.get("or");
    if (filter) {
      const match = filter.match(/ilike\."%(.*?)%"/);
      if (match)
        rows = rows.filter((p) =>
          (p.code + p.title).toLowerCase().includes(match[1].toLowerCase()),
        );
    }
    res.setHeader(
      "Content-Range",
      `0-${Math.max(0, rows.length - 1)}/${rows.length}`,
    );
    if (req.headers.accept?.includes("vnd.pgrst.object"))
      return res.end(JSON.stringify(rows[0] ?? null));
    if (req.method === "GET") {
      rows.sort((a, b) => a.code.localeCompare(b.code) || a.id.localeCompare(b.id));
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? rows.length);
      rows = rows.slice(offset, offset + limit);
    }
    return res.end(JSON.stringify(rows));
  }
  if (url.pathname === "/rest/v1/rpc/search_organizations")
    return res.end(JSON.stringify([entity]));
  if (url.pathname === "/rest/v1/rpc/project_manager_names")
    return res.end("[]");
  if (url.pathname === "/rest/v1/project_organizations") {
    if (req.method === "POST") {
      let raw = "";
      for await (const chunk of req) raw += chunk;
      associations.push({
        ...JSON.parse(raw),
        id: "00000000-0000-4000-8000-000000000011",
        organizations: entity,
      });
      res.statusCode = 201;
      return res.end();
    }
    return res.end(
      JSON.stringify(
        associations.filter(
          (a) => "eq." + a.project_id === url.searchParams.get("project_id"),
        ),
      ),
    );
  }
  if (url.pathname === "/rest/v1/rpc/remove_draft_project_organization") {
    associations.length = 0;
    return res.end("null");
  }
  if (req.url === "/auth/v1/logout?scope=local") {
    res.statusCode = 204;
    return res.end();
  }
  if (req.url === "/") return res.end("{}");
  res.statusCode = 404;
  res.end("{}");
}).listen(54329, "127.0.0.1");
