import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Campaign } from '../types/campaign';
import { useAuthStore } from '../store/useAuthStore';
import { useCharStore } from '../store/useCharStore';
import LinkCharModal from '../components/LinkCharModal';

interface Props {
  onCampaign: (id: string) => void;
  autoCreate?: boolean;
}

type FilterTab = 'tudo' | 'ativas' | 'arquivadas';

const STATUS_LABEL: Record<string, string> = { ativa: 'ATIVA', pausada: 'PAUSADA', arquivada: 'ARQUIVADA' };
const STATUS_COLOR: Record<string, string> = {
  ativa:      'var(--ok)',
  pausada:    'var(--hope)',
  arquivada:  'var(--text-dim)',
};

export default function CampaignListScreen({ onCampaign, autoCreate }: Props) {
  const user = useAuthStore(s => s.user);
  const allChars = useCharStore(s => s.chars);
  const patchChar = useCharStore(s => s.patchChar);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('tudo');
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Criar campanha
  const [createNome, setCreateNome] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const createInputRef = useRef<HTMLInputElement>(null);

  // Entrar com código
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  useEffect(() => {
    loadCampaigns();
    if (autoCreate) {
      setTimeout(() => {
        createInputRef.current?.focus();
        createInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, []);

  // close kebab on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuId]);

  async function loadCampaigns() {
    setLoading(true);
    try {
      const data = await api.campaigns.list();
      setCampaigns(data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createNome.trim()) return;
    setCreateLoading(true);
    setCreateError('');
    try {
      await api.campaigns.create(createNome.trim());
      setCreateNome('');
      await loadCampaigns();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar campanha';
      try { setCreateError(JSON.parse(msg).error ?? msg); } catch { setCreateError(msg); }
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleLinkChars(campaignId: string, charIds: string[]) {
    for (const id of charIds) {
      await patchChar(id, { campaign_id: campaignId });
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinError('');
    setJoinSuccess('');
    try {
      const res = await api.campaigns.join(joinCode.trim().toUpperCase());
      setJoinCode('');
      setJoinSuccess(`Solicitação enviada para "${res.campaign_nome}"!`);
      await loadCampaigns();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao entrar na campanha';
      try { setJoinError(JSON.parse(msg).error ?? msg); } catch { setJoinError(msg); }
    } finally {
      setJoinLoading(false);
    }
  }

  async function handleSetStatus(id: string, status: 'ativa' | 'pausada' | 'arquivada') {
    try {
      await api.campaigns.updateStatus(id, status);
      setCampaigns(cs => cs.map(c => c.id === id ? { ...c, status } : c));
    } catch { /* silent */ }
  }

  async function handleDelete(id: string) {
    try {
      await api.campaigns.delete(id);
      setCampaigns(cs => cs.filter(c => c.id !== id));
    } catch { /* silent */ }
  }

  function copyCode(e: React.MouseEvent, codigo: string, id: string) {
    e.stopPropagation();
    navigator.clipboard.writeText(codigo).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  }

  const filtered = campaigns.filter(c => {
    if (filter === 'ativas') return c.status === 'ativa' || c.status === 'pausada';
    if (filter === 'arquivadas') return c.status === 'arquivada';
    return true;
  });

  const linkableCampaigns = campaigns
    .filter(c => c.meu_status === 'aprovado')
    .map(c => ({ id: c.id, nome: c.nome }));

  const campaignNames = Object.fromEntries(campaigns.map(c => [c.id, c.nome]));

  return (
    <div className="camp-list-wrap">
      {/* Page header */}
      <div className="camp-list-header">
        <div>
          <h1 className="camp-list-title">Minhas Campanhas</h1>
          <p className="camp-list-sub">Gerencie suas campanhas, organize seus jogadores e acompanhe o progresso.</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="camp-list-body">
        {/* Left: campaigns grid */}
        <div className="camp-list-main">
          {/* Filter tabs + link button */}
          <div className="camp-filter-row">
            <div className="camp-filter-tabs">
              {(['tudo', 'ativas', 'arquivadas'] as FilterTab[]).map(tab => (
                <button
                  key={tab}
                  className={`camp-filter-tab${filter === tab ? ' active' : ''}`}
                  onClick={() => setFilter(tab)}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
            {linkableCampaigns.length > 0 && (
              <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setLinkModalOpen(true)}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>link</span>
                Vincular Personagens
              </button>
            )}
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-dim)', fontSize: '.85rem' }}>Carregando…</p>
          ) : (
            <div className="camp-grid">
              {filtered.map(c => {
                const isCreator = c.criador_id === user?.userId;
                const menuOpen = openMenuId === c.id;
                return (
                  <div key={c.id} className="camp-card">
                    {/* Top */}
                    <div className="camp-card-top">
                      <div className="camp-card-name">{c.nome}</div>
                      <span className="camp-status-badge" style={{ color: STATUS_COLOR[c.status] ?? 'var(--text-dim)', borderColor: STATUS_COLOR[c.status] ?? 'var(--border)' }}>
                        {STATUS_LABEL[c.status] ?? c.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="camp-card-members">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>group</span>
                      {c.total_membros} {c.total_membros !== 1 ? 'membros participando' : 'membro participando'}
                      {c.total_pendentes > 0 && (
                        <span style={{ marginLeft: 6, background: 'var(--hope)', color: '#12111a', borderRadius: 10, padding: '0 6px', fontSize: '.68rem', fontWeight: 800 }}>
                          {c.total_pendentes} pendente{c.total_pendentes !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {isCreator && (
                      <div className="camp-card-code-area">
                        <div className="camp-code-label">CÓDIGO DE CONVITE</div>
                        <div className="camp-code-row">
                          <span className="camp-code">{c.codigo}</span>
                          <button
                            className="btn btn-ghost btn-sm camp-copy-btn"
                            onClick={e => copyCode(e, c.codigo, c.id)}
                            title="Copiar código"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                              {copiedId === c.id ? 'check' : 'content_copy'}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="camp-card-acts">
                      <button className="btn camp-open-btn" onClick={() => onCampaign(c.id)}>
                        ABRIR
                      </button>
                      {isCreator && (
                        <div style={{ position: 'relative' }}>
                          <button
                            className="btn btn-ghost btn-sm camp-kebab-btn"
                            title="Mais opções"
                            onClick={e => { e.stopPropagation(); setOpenMenuId(menuOpen ? null : c.id); }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>more_vert</span>
                          </button>
                          {menuOpen && (
                            <div className="char-kebab-menu">
                              {c.status !== 'ativa' && (
                                <button className="char-kebab-item" onClick={e => { e.stopPropagation(); setOpenMenuId(null); handleSetStatus(c.id, 'ativa'); }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>play_circle</span>
                                  Ativar
                                </button>
                              )}
                              {c.status === 'ativa' && (
                                <button className="char-kebab-item" onClick={e => { e.stopPropagation(); setOpenMenuId(null); handleSetStatus(c.id, 'pausada'); }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>pause_circle</span>
                                  Pausar
                                </button>
                              )}
                              {c.status !== 'arquivada' && (
                                <button className="char-kebab-item" onClick={e => { e.stopPropagation(); setOpenMenuId(null); handleSetStatus(c.id, 'arquivada'); }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>archive</span>
                                  Arquivar
                                </button>
                              )}
                              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                              <button className="char-kebab-item danger" onClick={e => { e.stopPropagation(); setOpenMenuId(null); handleDelete(c.id); }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* New campaign placeholder card */}
              <button className="camp-new-card" onClick={() => createInputRef.current?.focus()}>
                <span className="camp-new-icon material-symbols-outlined">add_circle</span>
                <span className="camp-new-label">Nova Campanha</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: sidebar forms */}
        <div className="camp-list-side">
          {/* Create form */}
          <div className="camp-side-card">
            <div className="camp-side-card-title">
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--accent)' }}>auto_fix_high</span>
              Criar Nova Campanha
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label className="field-label">Nome da campanha</label>
                <input
                  ref={createInputRef}
                  className="inp"
                  type="text"
                  value={createNome}
                  onChange={e => setCreateNome(e.target.value)}
                  placeholder="ex: O Retorno do Rei Lich"
                  required
                />
              </div>
              {createError && <div style={{ color: 'var(--danger)', fontSize: '.82rem' }}>{createError}</div>}
              <button type="submit" className="btn camp-create-btn" disabled={createLoading}>
                {createLoading ? 'CRIANDO…' : 'CRIAR'}
              </button>
            </form>
          </div>

          {/* Join form */}
          <div className="camp-side-card">
            <div className="camp-side-card-title">
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--accent)' }}>key</span>
              Entrar com Código
            </div>
            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label className="field-label">Código de 6 caracteres</label>
                <input
                  className="inp camp-join-input"
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="XXXXXX"
                  maxLength={6}
                />
              </div>
              {joinError && <div style={{ color: 'var(--danger)', fontSize: '.82rem' }}>{joinError}</div>}
              {joinSuccess && <div style={{ color: 'var(--ok)', fontSize: '.82rem' }}>{joinSuccess}</div>}
              <button type="submit" className="btn camp-create-btn" disabled={joinLoading}>
                {joinLoading ? 'ENTRANDO…' : 'ENTRAR'}
              </button>
            </form>
          </div>

          {/* Info card */}
          <div className="camp-side-info">
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}>info</span>
            <p style={{ margin: 0, fontSize: '.78rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Como mestre, compartilhe o código de convite com seus jogadores para que eles possam entrar na campanha.
            </p>
          </div>
        </div>
      </div>

      {linkModalOpen && (
        <LinkCharModal
          campaigns={linkableCampaigns}
          chars={allChars}
          campaignNames={campaignNames}
          onLink={handleLinkChars}
          onClose={() => setLinkModalOpen(false)}
        />
      )}
    </div>
  );
}
