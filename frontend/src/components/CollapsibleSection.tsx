import { useState, ReactNode } from 'react';

interface Props {
  title: ReactNode;
  icon?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  headerRight?: ReactNode;
}

export default function CollapsibleSection({ title, icon, children, defaultOpen = true, headerRight }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`fsec${open ? '' : ' collapsed'}`}>
      <div className="fsec-hdr" onClick={() => setOpen(o => !o)}>
        <div className="fsec-hdr-left">
          {icon && (
            <span className="material-symbols-outlined fsec-icon" aria-hidden="true">{icon}</span>
          )}
          {title}
        </div>
        <span className="fsec-hdr-right">
          {headerRight && <span onClick={e => e.stopPropagation()}>{headerRight}</span>}
          <span className="material-symbols-outlined fsec-arrow">expand_more</span>
        </span>
      </div>
      {open && <div className="fsec-body">{children}</div>}
    </div>
  );
}
