import { useState, useEffect } from 'react';
import type { InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: number;
  fallback?: number;
  onChange: (v: number) => void;
};

export default function NumInput({ value, fallback = 0, min, max, onChange, ...rest }: Props) {
  const [local, setLocal] = useState(String(value));

  useEffect(() => {
    setLocal(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const n = parseInt(raw, 10);
    let v = isNaN(n) ? fallback : n;
    if (min !== undefined) v = Math.max(Number(min), v);
    if (max !== undefined) v = Math.min(Number(max), v);
    onChange(v);
    setLocal(String(v));
  };

  return (
    <input
      {...rest}
      type="number"
      min={min}
      max={max}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={e => commit(e.target.value)}
    />
  );
}
