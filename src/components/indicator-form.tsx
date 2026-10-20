"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import {
  saveIndicator,
  changeIndicatorArchive,
} from "@/app/(workspace)/projects/[id]/indicatori/actions";
import type { Indicator } from "@/lib/indicator-data";
import {
  indicatorTextFields,
  indicatorTypes,
  aggregations,
  indicatorValue,
} from "@/lib/indicators.mjs";
import { Submit } from "@/components/submit";
export function IndicatorForm({
  projectId,
  indicator,
  itemId,
  items,
}: {
  projectId: string;
  indicator?: Indicator;
  itemId?: string;
  items: { id: string; code: string; title: string }[];
}) {
  const [values, setValues] = useState<Record<string, string>>(() => ({
    type: "absolute",
    ratio_scale: "1",
    aggregation_method: "last",
    direction: "increase",
    status: "draft",
    framework_item_id: itemId ?? "",
    ...Object.fromEntries(
      Object.entries(indicator ?? {}).map(([k, v]) => [
        k,
        v == null ? "" : String(v),
      ]),
    ),
  }));
  const [state, action] = useActionState(
    saveIndicator.bind(null, projectId, indicator?.id ?? null),
    { message: "" },
  );
  function update(key: string, value: string) {
    setValues((old) => ({ ...old, [key]: value }));
  }
  function field(
    key: string,
    label: string,
    type = "text",
    required = false,
    max = 10000,
  ) {
    const props = {
      name: key,
      "aria-label": label,
      value: values[key] ?? "",
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => update(key, e.target.value),
      required,
      "aria-invalid": !!state.errors?.[key],
      "aria-describedby": state.errors?.[key]
        ? `indicator-${key}-error`
        : undefined,
    };
    return (
      <label key={key}>
        {label}
        {required ? " *" : ""}
        {type === "textarea" ? (
          <textarea {...props} rows={3} maxLength={max} />
        ) : (
          <input
            {...props}
            type={type}
            maxLength={max}
            inputMode={
              key.endsWith("value") ||
              key.endsWith("numerator") ||
              key.endsWith("denominator")
                ? "decimal"
                : undefined
            }
          />
        )}
        {state.errors?.[key] ? (
          <span id={`indicator-${key}-error`} className="field-error">
            {state.errors[key]}
          </span>
        ) : null}
      </label>
    );
  }
  function select(key: string, label: string, options: Record<string, string>) {
    return (
      <label key={key}>
        {label} *
        <select
          name={key}
          value={values[key] ?? ""}
          onChange={(e) => update(key, e.target.value)}
          aria-invalid={!!state.errors?.[key]}
        >
          {Object.entries(options).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        {state.errors?.[key] ? (
          <span className="field-error">{state.errors[key]}</span>
        ) : null}
      </label>
    );
  }
  const ratio = values.type === "ratio";
  return (
    <form action={action} onReset={(e) => e.preventDefault()}>
      <h2>{indicator ? "Modifica indicatore" : "Nuovo indicatore"}</h2>
      <p>
        I campi con * sono obbligatori. Una bozza può avere baseline e target
        non disponibili. Per attivare l’indicatore completa entrambi i gruppi
        con le date di riferimento.
      </p>
      {indicator ? (
        <input type="hidden" name="row_version" value={indicator.row_version} />
      ) : null}
      {select("framework_item_id", "Obiettivo o risultato collegato", {
        "": "Seleziona…",
        ...Object.fromEntries(
          items.map((i) => [i.id, `${i.code} — ${i.title}`]),
        ),
      })}
      <div className="project-fields">
        {field("code", "Codice indicatore", "text", true, 80)}
        {field("title", "Titolo indicatore", "text", true, 240)}
      </div>
      {field("description", indicatorTextFields.description, "textarea")}
      <label>
        Tipo *
        <select
          name="type"
          value={values.type}
          onChange={(e) =>
            setValues((old) => ({
              ...old,
              type: e.target.value,
              ratio_scale: e.target.value === "ratio" ? "100" : "1",
              aggregation_method: "last",
              baseline_value: "",
              target_value: "",
              baseline_numerator: "",
              baseline_denominator: "",
              target_numerator: "",
              target_denominator: "",
            }))
          }
        >
          {Object.entries(indicatorTypes).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <p>
        Il cambio di tipo svuota i valori numerici nel modulo. Un tasso
        ufficiale già calcolato può essere un valore numerico con unità «per
        1.000». Nei rapporti si conservano numeratore e denominatore.
      </p>
      <div className="project-fields">
        {field("unit", "Unità di misura", "text", true, 120)}
        {select("direction", "Direzione attesa", {
          increase: "Aumento",
          decrease: "Diminuzione",
        })}
        {select(
          "aggregation_method",
          "Aggregazione delle future rilevazioni",
          Object.fromEntries(
            Object.entries(aggregations).filter(([k]) =>
              ratio
                ? ["ratio_of_sums", "last"].includes(k)
                : ["sum", "last", "mean"].includes(k),
            ),
          ),
        )}
        {ratio ? (
          select("ratio_scale", "Scala", {
            "1": "Rapporto (N / D)",
            "100": "Percentuale (N / D × 100)",
          })
        ) : (
          <input type="hidden" name="ratio_scale" value="1" />
        )}
      </div>
      <p>
        Per serie cumulative scegli «Ultimo valore». La somma richiede
        contributi senza doppio conteggio; il rapporto fra le somme non è una
        media delle percentuali.
      </p>
      {ratio ? (
        <div className="project-fields">
          {field(
            "numerator_definition",
            indicatorTextFields.numerator_definition,
            "textarea",
          )}
          {field(
            "denominator_definition",
            indicatorTextFields.denominator_definition,
            "textarea",
          )}
        </div>
      ) : null}
      {(["baseline", "target"] as const).map((group) => (
        <fieldset key={group}>
          <legend>
            {group === "baseline"
              ? "Baseline — valore iniziale"
              : "Target — valore atteso"}
          </legend>
          <p>
            Se il dato o la data non sono disponibili, lascia vuoto l’intero
            gruppo e spiega nelle note. Non sostituire un dato mancante con
            zero.
          </p>
          <div className="project-fields">
            {field(`${group}_date`, "Data di riferimento", "date")}
            {ratio ? (
              <>
                {field(`${group}_numerator`, "Numeratore")}
                {field(`${group}_denominator`, "Denominatore")}
              </>
            ) : (
              field(`${group}_value`, "Valore")
            )}
          </div>
          {ratio ? (
            <p>
              Valore calcolato: <strong>{indicatorValue(values, group)}</strong>
              . Per una soglia percentuale prevista, es. 80%, si può usare
              80/100 indicando nelle note che è una soglia, non un conteggio
              osservato.
            </p>
          ) : null}
          {field(
            `${group}_note`,
            indicatorTextFields[`${group}_note`],
            "textarea",
          )}
        </fieldset>
      ))}
      {field("reference_code", indicatorTextFields.reference_code, "textarea")}
      {field(
        "measurement_period",
        indicatorTextFields.measurement_period,
        "textarea",
      )}
      {field(
        "verification_source",
        indicatorTextFields.verification_source,
        "textarea",
        true,
      )}
      {select("status", "Stato", { draft: "Bozza", active: "Attivo" })}
      {state.message ? (
        <p className="notice" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="actions">
        <Submit>Salva indicatore</Submit>
        <Link href={`/projects/${projectId}/indicatori`}>Annulla</Link>
      </div>
    </form>
  );
}
export function IndicatorArchive({
  projectId,
  indicator,
}: {
  projectId: string;
  indicator: Indicator;
}) {
  const [state, action] = useActionState(
    changeIndicatorArchive.bind(null, projectId, indicator.id),
    { message: "" },
  );
  const archived = indicator.status === "archived";
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !archived &&
          !window.confirm(
            "Archiviare questo indicatore? La definizione sarà conservata.",
          )
        )
          e.preventDefault();
      }}
    >
      <input type="hidden" name="row_version" value={indicator.row_version} />
      <input
        type="hidden"
        name="mode"
        value={archived ? "restore" : "archive"}
      />
      <Submit>
        {archived ? "Ripristina in bozza" : "Archivia indicatore"}
      </Submit>
      {state.message ? <p role="status">{state.message}</p> : null}
    </form>
  );
}
