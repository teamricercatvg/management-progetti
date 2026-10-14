"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { saveProject } from "@/app/(workspace)/projects/actions";
import type { Project } from "@/lib/project-data";
import { Submit } from "@/components/submit";
const fields = [
  ["code", "Codice", "text", 80, true],
  ["title", "Titolo", "text", 240, true],
  ["start_date", "Data di inizio", "date", undefined, true],
  ["end_date", "Data di fine", "date", undefined, true],
  ["currency_code", "Valuta principale (es. EUR)", "text", 3, true],
  ["donor", "Finanziatore", "text", 240, false],
  ["description", "Descrizione", "textarea", 10000, false],
  ["notes", "Note", "textarea", 10000, false],
] as const;
export function ProjectForm({ project }: { project?: Project }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map(([name]) => [
        name,
        project?.[name] ?? (name === "currency_code" ? "EUR" : ""),
      ]),
    ),
  );
  const [state, action] = useActionState(
    saveProject.bind(null, project?.id ?? null),
    { message: "" },
  );
  return (
    <form action={action}>
      <p>
        I campi contrassegnati con * sono obbligatori. I nuovi progetti vengono
        salvati in bozza.
      </p>
      {project ? (
        <input type="hidden" name="row_version" value={project.row_version} />
      ) : null}
      <div className="project-fields">
        {fields.map(([name, label, type, max, required]) => (
          <label key={name} className={type === "textarea" ? "full-width" : ""}>
            {label}
            {required ? " *" : ""}
            {type === "textarea" ? (
              <textarea
                name={name}
                value={values[name]}
                onChange={(event) =>
                  setValues((previous) => ({
                    ...previous,
                    [name]: event.target.value,
                  }))
                }
                rows={5}
                maxLength={max}
                aria-invalid={!!state.errors?.[name]}
                aria-describedby={
                  state.errors?.[name] ? `${name}-error` : undefined
                }
              />
            ) : (
              <input
                name={name}
                type={type}
                value={values[name]}
                onChange={(event) =>
                  setValues((previous) => ({
                    ...previous,
                    [name]: event.target.value,
                  }))
                }
                required={required}
                maxLength={max}
                aria-invalid={!!state.errors?.[name]}
                aria-describedby={
                  state.errors?.[name] ? `${name}-error` : undefined
                }
              />
            )}
            {state.errors?.[name] ? (
              <span id={`${name}-error`} className="field-error">
                {state.errors[name]}
              </span>
            ) : null}
          </label>
        ))}
      </div>
      {state.message ? (
        <p className="notice" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="actions">
        <Submit>Salva progetto</Submit>
        <Link href={project ? `/projects/${project.id}` : "/projects"}>
          Annulla
        </Link>
      </div>
    </form>
  );
}
