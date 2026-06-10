import { useState, ReactNode } from 'react';

interface Props {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  headerRight?: ReactNode;
}

export default function CollapsibleSection({ title, children, defaultOpen = true, headerRight }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`fsec${open ? '' : ' collapsed'}`}>
      <div className="fsec-hdr" onClick={() => setOpen(o => !o)}>
        {title}
        <span className="fsec-hdr-right">
          {headerRight && <span onClick={e => e.stopPropagation()}>{headerRight}</span>}
          <span className="fsec-arrow">▼</span>
        </span>
      </div>
      {open && <div className="fsec-body">{children}</div>}
    </div>
  );
}
