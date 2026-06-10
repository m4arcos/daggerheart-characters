import { useState, useEffect, FormEvent } from 'react';
import { useCharStore } from '../store/useCharStore';
import { useAuthStore } from '../store/useAuthStore';
import { CLS } from '../constants/cls';
import Modal from '../components/Modal';
import { api } from '../api';
import { AdminUser } from '../types/auth';

interface Props {
  onNew: () => void;
  onEdit: (id: string) => void;
  onSession: (id: string) => void;
}

export default function ListScreen({ onNew, onEdit, onSession }: Props) {
  const chars = useCharStore(s => s.chars);
  const charOwners = useCharStore(s => s.charOwners);
  const deleteChar = useCharStore(s => s.deleteChar);
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.isAdmin ?? false;

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Criar usuário
  const [createOpen, setCreateOpen] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSenha, setNewSenha] = useState('');
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Editar usuário
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSenha, setEditSenha] = useState('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (isAdmin && adminOpen) {
      loadUsers();
    }
  }, [isAdmin, adminOpen]);

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const data = await api.admin.listUsers();
      setUsers(data);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      await api.admin.createUser(newNome, newEmail, newSenha);
      setNewNome(''); setNewEmail(''); setNewSenha('');
      setCreateOpen(false);
      await loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar usuário';
      try { setCreateError(JSON.parse(msg).error ?? msg); } catch { setCreateError(msg); }
    } finally {
      setCreateLoading(false);
    }
  }

  function openEdit(u: AdminUser) {
    setEditUserId(u.id);
    setEditNome(u.nome);
    setEditEmail(u.email);
    setEditSenha('');
    setEditError('');
    setCreateOpen(false);
  }

  function cancelEdit() {
    setEditUserId(null);
    setEditError('');
  }

  async function handleEditUser(e: FormEvent) {
    e.preventDefault();
    if (!editUserId) return;
    setEditError('');
    setEditLoading(true);
    try {
      await api.admin.updateUser(editUserId, editNome, editEmail, editSenha || undefined);
      setEditUserId(null);
      await loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar';
      try { setEditError(JSON.parse(msg).error ?? msg); } catch { setEditError(msg); }
    } finally {
      setEditLoading(false);
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteChar(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="list-wrap">
      {isAdmin && (
        <div className="fsec" style={{ marginBottom: 16 }}>
          <div
            className="fsec-hdr"
            onClick={() => setAdminOpen(v => !v)}
            style={{ cursor: 'pointer' }}
          >
            👥 Admin — Gerenciar Usuários
            <span className="fsec-hdr-right">
              <button
                className="btn btn-primary btn-sm"
                onClick={e => {
                  e.stopPropagation();
                  if (!adminOpen) setAdminOpen(true);
                  setCreateOpen(v => !v);
                  setEditUserId(null);
                }}
              >
                {createOpen ? '✕ Cancelar' : '+ Criar'}
              </button>
              <span className="fsec-arrow" style={{ transform: adminOpen ? 'none' : 'rotate(-90deg)' }}>▼</span>
            </span>
          </div>

          {adminOpen && (
            <div className="fsec-body" style={{ padding: '12px 0 0' }}>
              {createOpen && (
                <form onSubmit={handleCreateUser} style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label className="field-label">Nome</label>
                      <input className="inp" value={newNome} onChange={e => setNewNome(e.target.value)} required placeholder="Nome do usuário" />
                    </div>
                    <div>
                      <label className="field-label">Email</label>
                      <input className="inp" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required placeholder="email@exemplo.com" />
                    </div>
                  </div>
                  <div>
                    <label className="field-label">Senha temporária</label>
                    <input className="inp" type="text" value={newSenha} onChange={e => setNewSenha(e.target.value)} required placeholder="Usuário vai trocar no primeiro acesso" />
                  </div>
                  {createError && <div style={{ color: 'var(--danger)', fontSize: '.82rem' }}>{createError}</div>}
                  <button type="submit" className="btn btn-primary btn-sm" disabled={createLoading}>
                    {createLoading ? 'Criando…' : 'Criar Usuário'}
                  </button>
                </form>
              )}

              {loadingUsers ? (
                <p style={{ color: 'var(--text-dim)', fontSize: '.85rem', padding: '0 8px 12px' }}>Carregando…</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                      <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 400 }}>Nome</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 400 }}>Email</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 400 }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 400 }}>Último login</th>
                      <th style={{ padding: '4px 8px', fontWeight: 400 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <>
                        <tr key={u.id} style={{ borderBottom: editUserId === u.id ? 'none' : '1px solid var(--border)' }}>
                          <td style={{ padding: '6px 8px' }}>
                            {u.nome}
                            {u.is_admin === 1 && <span style={{ marginLeft: 6, fontSize: '.7rem', color: 'var(--accent)', fontWeight: 600 }}>ADMIN</span>}
                          </td>
                          <td style={{ padding: '6px 8px', color: 'var(--text-dim)' }}>{u.email}</td>
                          <td style={{ padding: '6px 8px' }}>
                            {u.temp_ativa ? (
                              <span style={{ color: 'var(--hope)', fontSize: '.78rem' }}>senha temporária</span>
                            ) : (
                              <span style={{ color: 'var(--ok)', fontSize: '.78rem' }}>senha definitiva</span>
                            )}
                          </td>
                          <td style={{ padding: '6px 8px', color: 'var(--text-dim)', fontSize: '.78rem', whiteSpace: 'nowrap' }}>
                            {u.last_login
                              ? new Date(u.last_login * 1000).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                              : <span style={{ color: 'var(--border-hi)' }}>nunca</span>
                            }
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                            {editUserId === u.id ? (
                              <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>✕</button>
                            ) : (
                              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>✏</button>
                            )}
                          </td>
                        </tr>
                        {editUserId === u.id && (
                          <tr key={u.id + '-edit'} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td colSpan={5} style={{ padding: '0 8px 12px' }}>
                              <form onSubmit={handleEditUser} style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: 14, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                  <div>
                                    <label className="field-label">Nome</label>
                                    <input className="inp" value={editNome} onChange={e => setEditNome(e.target.value)} required />
                                  </div>
                                  <div>
                                    <label className="field-label">Email</label>
                                    <input className="inp" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} required />
                                  </div>
                                </div>
                                <div>
                                  <label className="field-label">Nova senha temporária <span style={{ color: 'var(--text-dim)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(deixe vazio para não alterar)</span></label>
                                  <input className="inp" type="text" value={editSenha} onChange={e => setEditSenha(e.target.value)} placeholder="Nova senha temporária opcional" />
                                </div>
                                {editError && <div style={{ color: 'var(--danger)', fontSize: '.82rem' }}>{editError}</div>}
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button type="submit" className="btn btn-primary btn-sm" disabled={editLoading}>
                                    {editLoading ? 'Salvando…' : '💾 Salvar'}
                                  </button>
                                  <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancelar</button>
                                </div>
                              </form>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '10px 8px', color: 'var(--text-dim)' }}>Nenhum usuário cadastrado.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

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
            const owner = charOwners[c.id];
            return (
              <div key={c.id} className="char-card" onClick={() => onSession(c.id)}>
                {isAdmin && owner && (
                  <div style={{ fontSize: '.72rem', color: 'var(--text-dim)', marginBottom: 4 }}>
                    👤 {owner.nome}
                  </div>
                )}
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
