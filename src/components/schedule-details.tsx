"use client";

import { useId, useState, type ReactNode } from "react";

export function ScheduleDetails({ label, children }: { label: string; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        className="schedule-details-toggle"
        aria-expanded={expanded}
        aria-controls={id}
        aria-label={`${expanded ? "Nascondi" : "Mostra"} dettagli ${label}`}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Nascondi dettagli" : "Mostra dettagli"}
      </button>
      <div id={id} className="schedule-details" hidden={!expanded}>{children}</div>
    </>
  );
}
