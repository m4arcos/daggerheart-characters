import { useRef, useState } from 'react';
import { uploadImage } from '../api';

interface Props {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  shape?: 'square' | 'circle';
  size?: number;
  placeholder?: string;
}

export default function ImageUpload({
  value,
  onChange,
  label = 'Imagem',
  shape = 'square',
  size = 96,
  placeholder,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setLoading(true);
    try {
      const { url } = await uploadImage(file);
      onChange(url);
    } catch {
      setError('Erro ao enviar imagem');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const radius = shape === 'circle' ? '50%' : 'var(--r)';

  return (
    <div className="img-upload-root">
      {label && <span className="field-label">{label}</span>}
      <div
        className={`img-upload-preview${loading ? ' loading' : ''}`}
        style={{ width: size, height: size, borderRadius: radius }}
        onClick={() => !loading && inputRef.current?.click()}
        title="Clique para alterar"
      >
        {value ? (
          <img
            src={value}
            alt={label}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: radius, display: 'block' }}
          />
        ) : (
          <div className="img-upload-empty">
            <span className="material-symbols-outlined" style={{ fontSize: size * 0.3, opacity: .4 }}>
              {placeholder ?? 'add_photo_alternate'}
            </span>
          </div>
        )}
        <div className="img-upload-overlay">
          {loading ? (
            <span className="material-symbols-outlined" style={{ fontSize: 20, animation: 'spin 1s linear infinite' }}>progress_activity</span>
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>photo_camera</span>
          )}
        </div>
      </div>
      {value && !loading && (
        <button
          type="button"
          className="img-upload-remove"
          onClick={() => onChange('')}
          title="Remover imagem"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>close</span>
          Remover
        </button>
      )}
      {error && <span style={{ fontSize: '.72rem', color: 'var(--danger)', display: 'block', marginTop: 3 }}>{error}</span>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
    </div>
  );
}
