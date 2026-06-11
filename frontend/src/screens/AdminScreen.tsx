import { useState, useEffect, FormEvent } from 'react';
import { api } from '../api';
import { AdminUser } from '../types/auth';

export default function AdminScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSenha, setNewSenha] = useState('');
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSenha, setEditSenha] = useState('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      setUsers(await api.admin.listUsers());
    } finally {
      setLoading(false);
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

  return (
    <div className="admin-wrap">
      {/* Header */}
      <div className="admin-top">
        <div>
          <h1 className="admin-title">Gerenciar Usuários</h1>
          <p className="admin-subtitle">{users.length} {users.length === 1 ? 'usuário cadastrado' : 'usuários cadastrados'}</p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { setCreateOpen(v => !v); setEditUserId(null); }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }} aria-hidden="true">
            {createOpen ? 'close' : 'person_add'}
          </span>
          {createOpen ? 'Cancelar' : 'Novo Usuário'}
        </button>
      </div>

      {/* Create form */}
      {createOpen && (
        <div className="admin-card" style={{ marginBottom: 16 }}>
          <div className="admin-card-title">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">person_add</span>
            Novo Usuário
          </div>
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
            {createError && (
              <div style={{ color: 'var(--danger)', fontSize: '.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>error</span>
                {createError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={createLoading}>
                {createLoading ? 'Criando…' : 'Criar Usuário'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCreateOpen(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="admin-card">
        {loading ? (
          <p style={{ color: 'var(--text-dim)', fontSize: '.85rem', padding: '8px 0' }}>Carregando…</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Email</th>
                <th>Status</th>
                <th>Último login</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <>
                  <tr key={u.id} className={editUserId === u.id ? 'editing' : ''}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="admin-avatar" aria-hidden="true">
                          {u.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{u.nome}</div>
                          {u.is_admin === 1 && (
                            <span className="admin-badge">ADMIN</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-dim)', fontSize: '.85rem' }}>{u.email}</td>
                    <td>
                      {u.temp_ativa ? (
                        <span className="admin-status warning">
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
                          senha temporária
                        </span>
                      ) : (
                        <span className="admin-status ok">
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>
                          senha definitiva
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-dim)', fontSize: '.8rem', whiteSpace: 'nowrap' }}>
                      {u.last_login
                        ? new Date(u.last_login * 1000).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                        : <span style={{ color: 'rgba(200,170,90,.3)' }}>nunca</span>
                      }
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {editUserId === u.id ? (
                        <button className="btn btn-ghost btn-sm" onClick={cancelEdit} title="Cancelar edição">
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
                        </button>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)} title="Editar usuário">
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>edit</span>
                        </button>
                      )}
                    </td>
                  </tr>

                  {editUserId === u.id && (
                    <tr key={u.id + '-edit'} className="edit-row">
                      <td colSpan={5}>
                        <form onSubmit={handleEditUser} className="admin-edit-form">
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
                            <label className="field-label">
                              Nova senha temporária{' '}
                              <span style={{ color: 'var(--text-dim)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                                (deixe vazio para não alterar)
                              </span>
                            </label>
                            <input className="inp" type="text" value={editSenha} onChange={e => setEditSenha(e.target.value)} placeholder="Nova senha temporária opcional" />
                          </div>
                          {editError && (
                            <div style={{ color: 'var(--danger)', fontSize: '.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>error</span>
                              {editError}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="submit" className="btn btn-primary btn-sm" disabled={editLoading}>
                              {editLoading ? 'Salvando…' : 'Salvar'}
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancelar</button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} style={{ padding: '16px 0', color: 'var(--text-dim)', textAlign: 'center', fontSize: '.85rem' }}>
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
