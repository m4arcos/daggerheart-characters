import { useState } from 'react';
import { useCharStore } from '../store/useCharStore';
import { CLS } from '../constants/cls';
import Modal from '../components/Modal';

interface Props {
  onNew: () => void;
  onEdit: (id: string) => void;
  onSession: (id: string) => void;
}

export default function ListScreen({ onNew, onEdit, onSession }: Props) {
  const chars = useCharStore(s => s.chars);
  const deleteChar = useCharStore(s => s.deleteChar);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteChar(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="list-wrap">
      <div className="list-top">
        <h2>{chars.length} {chars.length !== 1 ? 'personagens' : 'personagem'}</h2>
        <button className="btn btn-primary" onClick={onNew}>+ Novo Personagem</button>
      </div>

      {chars.length === 0 ? (
        <div className="empty-state">
          <h3>Nenhum personagem ainda</h3>
          <p>Crie seu primeiro personagem para começar.</p>
          <button className="btn btn-primary" onClick={onNew}>+ Criar Personagem</button>
        </div>
      ) : (
        <div className="char-grid">
          {chars.map(c => {
            const cls = CLS[c.cls] || { nome: c.cls };
            return (
              <div key={c.id} className="char-card" onClick={() => onSession(c.id)}>
                <div className="cc-cls">{cls.nome} — Nível {c.nivel}</div>
                <div className="cc-name">{c.nome}</div>
                <div className="cc-sub">
                  {c.heranca}{c.subclasse ? ` · ${c.subclasse}` : ''}
                </div>
                <div className="cc-stats">
                  <span><strong>{c.pvAtual}/{c.pvMax}</strong> PV</span>
                  <span><strong>{c.pfAtual}/{c.pfMax}</strong> PF</span>
                  <span><strong>{c.esperanca}/6</strong> ✦</span>
                </div>
                <div className="cc-acts" onClick={e => e.stopPropagation()}>
                  <button className="btn btn-primary btn-sm" onClick={() => onSession(c.id)}>▶ Ver Ficha</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => onEdit(c.id)}>✏ Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget({ id: c.id, nome: c.nome })}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <Modal
          title="Excluir personagem?"
          message={`"${deleteTarget.nome}" será removido permanentemente.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
