import test from "node:test";
import assert from "node:assert/strict";
import { selectDirectoryRows, directoryColumns } from "../src/lib/admin-directory.mjs";
const rows = Array.from({ length: 60 }, (_, i) => ({ id: String(i).padStart(3, "0"), name: `Utente ${i}`, email: `user${i}@example.test`, status: i % 2 ? "Attivo" : "Disabilitato", role: i % 3 ? "Manager" : "Admin", projectsText: i === 59 ? "TIR — Pediatrìa Tirana" : "Nessun progetto" }));
test("directory search covers all rows before pagination and matches literal email/project, ignoring accents", () => {
  assert.equal(selectDirectoryRows(rows, "user59@example.test")[0].id, "059");
  assert.equal(selectDirectoryRows(rows, "pediatria tirana")[0].id, "059");
  assert.equal(selectDirectoryRows(rows, "%").length, 0);
  assert.equal(selectDirectoryRows(rows, "Tirana", { role: "admin" }).length, 0);
  assert.equal(selectDirectoryRows(rows, "Tirana", { role: "manager", status: "attivo" }).length, 1);
});
test("every column is filterable and sortable, ordering is stable and input is preserved", () => {
  const original = JSON.stringify(rows);
  for (const [column] of directoryColumns) {
    const asc = selectDirectoryRows(rows, "", {}, column, "asc");
    const desc = selectDirectoryRows(rows, "", {}, column, "desc");
    const collator = new Intl.Collator("it", { numeric: true, sensitivity: "base" });
    for (let i = 1; i < rows.length; i++) {
      assert.ok(collator.compare(asc[i - 1][column], asc[i][column]) <= 0);
      assert.ok(collator.compare(desc[i - 1][column], desc[i][column]) >= 0);
    }
    assert.ok(selectDirectoryRows(rows, "", { [column]: rows[59][column] }).some(row => row.id === "059"));
  }
  assert.equal(JSON.stringify(rows), original);
});


test("project filters include global Admin access only for existing projects", () => {
  const directory = [
    { id: "1", name: "Admin", email: "admin@example.test", status: "Attivo", role: "Admin", isAdmin: true, projectsText: "Accesso a tutti i progetti", projectsSearchText: "ALBANIA — Hub pediatrico a Tirana ARCH — Progetto archiviato" },
    { id: "2", name: "Manager Albania", email: "manager@example.test", status: "Attivo", role: "Manager", isAdmin: false, projectsText: "ALBANIA — Hub pediatrico a Tirana" },
    { id: "3", name: "Altro utente", email: "other@example.test", status: "Attivo", role: "Manager", isAdmin: false, projectsText: "ALTRO — Progetto diverso" },
  ];
  const ids = (query = "", filters = {}) => selectDirectoryRows(directory, query, filters).map(row => row.id);
  assert.deepEqual(ids("", { projectsText: "albania" }), ["1", "2"]);
  assert.deepEqual(ids("", { projectsText: "PEDIATRICO" }), ["1", "2"]);
  assert.deepEqual(ids("Albania"), ["1", "2"]);
  assert.deepEqual(ids("", { projectsText: "archiviato" }), ["1"]);
  assert.deepEqual(ids("", { projectsText: "inesistente" }), []);
  assert.deepEqual(ids("", { projectsText: "Albania", role: "manager" }), ["2"]);
  assert.deepEqual(ids("", { projectsText: "Albania", status: "disabilitato" }), []);
  assert.deepEqual(ids("other@example.test", { projectsText: "Albania" }), []);
  assert.deepEqual(ids("", { projectsText: "Accesso a tutti" }), ["1"]);
});
