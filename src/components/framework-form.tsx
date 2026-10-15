"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import {
  saveFramework,
  setFrameworkStatus,
} from "@/app/(workspace)/projects/[id]/quadro-logico/actions";
import { frameworkTypes, parentTypes } from "@/lib/framework.mjs";
import type { FrameworkItem } from "@/lib/framework-data";
import { Submit } from "@/components/submit";
export function FrameworkForm({
  projectId,
  item,
  parents,
}: {
  projectId: string;
  item?: FrameworkItem;
  parents: Pick<FrameworkItem, "id" | "type" | "code" | "title" | "status">[];
}) {
  const [values, setValues] = useState<Record<string, string>>({
    type: item?.type ?? "general_objective",
    parent_id: item?.parent_id ?? "",
    code: item?.code ?? "",
    title: item?.title ?? "",
    description: item?.description ?? "",
    assumptions: item?.assumptions ?? "",
    sort_order: String(item?.sort_order ?? 0),
  });
  const [state, action] = useActionState(
    saveFramework.bind(null, projectId, item?.id ?? null),
    { message: "" },
  );
  const update = (name: string, value: string) =>
    setValues((old) => ({ ...old, [name]: value }));
  const parentType = parentTypes[values.type as keyof typeof parentTypes];
  return (
    <form action={action}>
      <h2>{item ? "Modifica elemento" : "Nuovo elemento"}</h2>
      <p>
        I campi con * sono obbligatori. L’ordine crescente si applica tra
        elementi dello stesso genitore.
      </p>
      {item ? (
        <input type="hidden" name="row_version" value={item.row_version} />
      ) : null}
      <label>
        Livello *
        <select
          name="type"
          value={values.type}
          onChange={(e) =>
            setValues((old) => ({
              ...old,
              type: e.target.value,
              parent_id: "",
            }))
          }
        >
          {Object.entries(frameworkTypes).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {parentType ? (
        <label>
          Genitore *
          <select
            name="parent_id"
            required
            value={values.parent_id}
            onChange={(e) => update("parent_id", e.target.value)}
          >
            <option value="">Seleziona…</option>
            {parents
              .filter(
                (p) =>
                  p.type === parentType &&
                  p.status === "active" &&
                  p.id !== item?.id,
              )
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.title}
                </option>
              ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="parent_id" value="" />
      )}
      <div className="project-fields">
        {(
          [
            ["code", "Codice", 80],
            ["title", "Titolo", 240],
            ["description", "Descrizione", 10000],
            ["assumptions", "Ipotesi e condizioni", 10000],
            ["sort_order", "Ordine", undefined],
          ] as const
        ).map(([name, label, max]) => (
          <label key={name} className={max === 10000 ? "full-width" : ""}>
            {label}
            {max !== 10000 ? " *" : ""}
            {max === 10000 ? (
              <textarea
                name={name}
                rows={4}
                maxLength={max}
                value={values[name]}
                onChange={(e) => update(name, e.target.value)}
              />
            ) : (
              <input
                name={name}
                type={name === "sort_order" ? "number" : "text"}
                min={name === "sort_order" ? 0 : undefined}
                max={name === "sort_order" ? 2147483647 : undefined}
                step={name === "sort_order" ? 1 : undefined}
                required
                maxLength={max}
                value={values[name]}
                onChange={(e) => update(name, e.target.value)}
              />
            )}
          </label>
        ))}
      </div>
      {state.message ? (
        <div className="notice" role="alert">
          <p>{state.message}</p>
          {state.errors ? (
            <ul>
              {Object.entries(state.errors).map(([key, value]) => (
                <li key={key}>{value}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div className="actions">
        <Submit>Salva elemento</Submit>
        <Link href={`/projects/${projectId}/quadro-logico`}>Annulla</Link>
      </div>
    </form>
  );
}
export function FrameworkStatus({
  projectId,
  item,
}: {
  projectId: string;
  item: Pick<FrameworkItem, "id" | "status" | "row_version">;
}) {
  const [state, action] = useActionState(
    setFrameworkStatus.bind(null, projectId, item.id),
    { message: "" },
  );
  return (
    <form action={action}>
      <input type="hidden" name="row_version" value={item.row_version} />
      <input
        type="hidden"
        name="status"
        value={item.status === "active" ? "archived" : "active"}
      />
      <Submit>
        {item.status === "active" ? "Archivia elemento" : "Riattiva elemento"}
      </Submit>
      {state.message ? (
        <p role="status" className="notice">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
