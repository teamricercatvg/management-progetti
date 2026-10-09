import { copyFile, mkdir } from "node:fs/promises";
const destination = new URL("../public/auth-templates/", import.meta.url);
await mkdir(destination, { recursive: true });
for (const kind of ["invite", "recovery"]) {
  await copyFile(
    new URL(`../supabase/templates/${kind}.html`, import.meta.url),
    new URL(`${kind}.html`, destination),
  );
}
