import { useEffect, useState, type CSSProperties } from 'react';

export function SmoothRange({ value, min = 0, max, step, playing = false, label, onChange }: { value: number; min?: number; max: number; step?: number; playing?: boolean; label: string; onChange: (value: number) => void }) {
  const [dragging, setDragging] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (!dragging) setDraft(value); }, [value, dragging]);
  const safeMax = Math.max(max, min + .0001);
  const displayValue = dragging ? draft : value;
  const progress = Math.max(0, Math.min(100, ((displayValue - min) / (safeMax - min)) * 100));
  const preview = (next: number) => { setDraft(next); if (!dragging) onChange(next); };
  const commit = (next: number) => { setDraft(next); setDragging(false); onChange(next); };
  return <div className={`smooth-range ${playing ? 'is-playing' : ''} ${dragging ? 'is-dragging' : ''}`} style={{ '--smooth-progress': `${progress}%` } as CSSProperties}>
    <span className="smooth-range-track"><i /></span><span className="smooth-range-thumb" />
    <input type="range" min={min} max={safeMax} step={step} value={Math.min(displayValue, safeMax)} onPointerDown={event => { setDraft(Number(event.currentTarget.value)); setDragging(true); }} onPointerUp={event => commit(Number(event.currentTarget.value))} onPointerCancel={event => commit(Number(event.currentTarget.value))} onBlur={event => { if (dragging) commit(Number(event.currentTarget.value)); }} onInput={event => preview(Number(event.currentTarget.value))} aria-label={label} />
  </div>;
}
