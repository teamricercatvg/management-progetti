"use client";
import { useEffect, useId, useRef, useState } from "react";

export function CompactText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const id = useId();
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
      setOverflows(element.scrollHeight > lineHeight + 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [text]);
  return <div className="compact-text">
    <p ref={ref} id={id} className={`prose-text${expanded ? "" : " text-one-line"}`}>{text}</p>
    {overflows || expanded ? <button type="button" className="text-toggle" aria-expanded={expanded} aria-controls={id}
      onClick={() => setExpanded((value) => !value)}>{expanded ? "Meno" : "Altro..."}</button> : null}
  </div>;
}
