import { useState, useEffect } from 'react';
import { api } from '../api';
import { CampaignDetail } from '../types/campaign';
import { Character } from '../types/character';
import { CLS } from '../constants/cls';
import { useAuthStore } from '../store/useAuthStore';
import { useCharStore } from '../store/useCharStore';

interface Props {
  campaignId: string;
  onNewChar: (campaignId: string) => void;
  onViewChar: (charId: string) => void;
  onEditChar: (charId: string) => void;
  onViewOtherChar: (char: Character & { _owner?: { id: string; nome: string } }) => void;
}

export default function CampaignScreen({ campaignId, onNewChar, onViewChar, onEditChar, onViewOtherChar }: Props) {
  const user = useAuthStore(s => s.user);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [chars, setChars] = useState<(Character & { _owner?: { id: string; nome: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [charsLoading, setCharsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'membros' | 'personagens'>('personagens');
  const [copied, setCopied] = useState(false);
  const [approveLoading, setApproveLoading] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);
  const [linkCharId, setLinkCharId] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);

  const allChars = useCharStore(s => s.chars);
  const patchChar = useCharStore(s => s.patchChar);
  const linkedIds = new Set(chars.map(c => c.id));
  const linkableChars = allChars.filter(c => !c.campaign_id && !linkedIds.has(c.id));

  useEffect(() => {
    loadCampaign();
    loadChars();
  }, [campaignId]);

  async function loadCampaign() {
    setLoading(true);
    setError('');
    try {
      const data = await api.campaigns.get(campaignId);
      setCampaign(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar campanha';
      try { setError(JSON.parse(msg).error ?? msg); } catch { setError(msg); }
    } finally {
      setLoading(false);
    }
  }

  async function loadChars() {
    setCharsLoading(true);
    try {
      const data = await api.campaigns.getCharacters(campaignId);
      setChars(data as (Character & { _owner?: { id: string; nome: string } })[]);
    } catch {
      setChars([]);
    } finally {
      setCharsLoading(false);
    }
  }

  async function handleApprove(uid: string) {
    setApproveLoading(uid);
    try {
      await api.campaigns.approveMember(campaignId, uid);
      await loadCampaign();
    } catch {
      // ignore
    } finally {
      setApproveLoading(null);
    }
  }

  async function handleRemove(uid: string) {
    setRemoveLoading(uid);
    try {
      await api.campaigns.removeMember(campaignId, uid);
      await loadCampaign();
      await loadChars();
    } catch {
      // ignore
    } finally {
      setRemoveLoading(null);
    }
  }

  async function handleLinkChar() {
    if (!linkCharId) return;
    setLinkLoading(true);
    try {
      await patchChar(linkCharId, { campaign_id: campaignId });
      setLinkCharId('');
      await loadChars();
    } finally {
      setLinkLoading(false);
    }
  }

  function copyCode() {
    if (!campaign) return;
    navigator.clipboard.writeText(campaign.codigo).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return <div className="list-wrap"><p style={{ color: 'var(--text-dim)' }}>Carregando…</p></div>;
  }

  if (error || !campaign) {
    return (
      <div className="list-wrap">
        <div style={{ color: 'var(--danger)', background: 'var(--surface2)', padding: '10px 14px', borderRadius: 'var(--r)', fontSize: '.85rem' }}>
          {error || 'Campanha não encontrada'}
        </div>
      </div>
    );
  }

  const isCreator = campaign.isCreator;
  const userId = user?.userId ?? '';

  return (
    <div className="list-wrap">
      {/* Header da campanha */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: '.65rem', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>
          Campanha
        </div>
        <h2 style={{ fontSize: '1.3rem', color: 'var(--text)', marginBottom: 4 }}>{campaign.nome}</h2>
        <div style={{ color: 'var(--text-dim)', fontSize: '.82rem', marginBottom: isCreator ? 12 : 0 }}>
          Mestre: {campaign.criador_nome}
          {' · '}
          {campaign.total_membros} membro{campaign.total_membros !== 1 ? 's' : ''}
        </div>

        {isCreator && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <div style={{ fontSize: '.65rem', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
              Código de convite:
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--accent)', background: 'var(--surface2)', borderRadius: 4, padding: '4px 12px', letterSpacing: 4, border: '1px solid var(--border)' }}>
              {campaign.codigo}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={copyCode}>
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn btn-sm ${activeTab === 'personagens' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('personagens')}
        >
          Personagens
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'membros' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('membros')}
        >
          Membros
          {campaign.membros.some(m => m.status === 'pendente') && (
            <span style={{ background: 'var(--hope)', color: '#12111a', borderRadius: 10, padding: '1px 6px', fontSize: '.7rem', fontWeight: 700, marginLeft: 4 }}>
              {campaign.membros.filter(m => m.status === 'pendente').length}
            </span>
          )}
        </button>
      </div>

      {/* Aba: Personagens */}
      {activeTab === 'personagens' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
            {linkableChars.length > 0 && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 0 }}>
                <select
                  value={linkCharId}
                  onChange={e => setLinkCharId(e.target.value)}
                  style={{ flex: 1, minWidth: 0, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', padding: '5px 8px', fontSize: '.82rem' }}
                >
                  <option value="">Vincular personagem existente…</option>
                  {linkableChars.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} ({CLS[c.cls]?.nome ?? c.cls})</option>
                  ))}
                </select>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={!linkCharId || linkLoading}
                  onClick={handleLinkChar}
                >
                  {linkLoading ? '…' : 'Vincular'}
                </button>
              </div>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => onNewChar(campaignId)}>
              + Criar Personagem
            </button>
          </div>

          {charsLoading ? (
            <p style={{ color: 'var(--text-dim)', fontSize: '.85rem' }}>Carregando personagens…</p>
          ) : chars.length === 0 ? (
            <div className="empty-state">
              <h3>Nenhum personagem ainda</h3>
              <p>Crie o primeiro personagem desta campanha.</p>
            </div>
          ) : (
            <div className="char-grid">
              {chars.map(c => {
                const cls = CLS[c.cls] || { nome: c.cls };
                const isOwner = c._owner?.id === userId;
                return (
                  <div key={c.id} className="char-card" style={{ cursor: 'pointer' }} onClick={() => isOwner ? onViewChar(c.id) : onViewOtherChar(c)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                      <div className="cc-cls">{cls.nome} — Nível {c.nivel}</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {c.privado && (
                          <span style={{ fontSize: '.68rem', color: 'var(--text-dim)', background: 'var(--surface3)', borderRadius: 3, padding: '1px 5px' }}>
                            Privado
                          </span>
                        )}
                        {c._owner && (
                          <span style={{ fontSize: '.68rem', color: 'var(--text-dim)' }}>
                            {c._owner.nome}
                          </span>
                        )}
                      </div>
                    </div>
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
                      {isOwner ? (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => onViewChar(c.id)}>Ver Ficha</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => onEditChar(c.id)}>Editar</button>
                        </>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => onViewOtherChar(c)}>👁 Ver Ficha</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Aba: Membros */}
      {activeTab === 'membros' && (
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 400 }}>Nome</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 400 }}>Email</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 400 }}>Status</th>
                {isCreator && <th style={{ padding: '4px 8px', fontWeight: 400 }}></th>}
              </tr>
            </thead>
            <tbody>
              {campaign.membros.map(m => (
                <tr key={m.user_id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 8px' }}>
                    {m.nome}
                    {m.user_id === campaign.criador_id && (
                      <span style={{ marginLeft: 6, fontSize: '.7rem', color: 'var(--hope)', fontWeight: 600 }}>Mestre</span>
                    )}
                    {m.user_id === userId && m.user_id !== campaign.criador_id && (
                      <span style={{ marginLeft: 6, fontSize: '.7rem', color: 'var(--text-dim)' }}>(você)</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 8px', color: 'var(--text-dim)' }}>{m.email}</td>
                  <td style={{ padding: '8px 8px' }}>
                    {m.status === 'aprovado' ? (
                      <span style={{ color: 'var(--ok)', fontSize: '.78rem' }}>Aprovado</span>
                    ) : (
                      <span style={{ color: 'var(--hope)', fontSize: '.78rem' }}>Pendente</span>
                    )}
                  </td>
                  {isCreator && (
                    <td style={{ padding: '8px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {m.user_id !== campaign.criador_id && (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          {m.status === 'pendente' && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--ok)', borderColor: 'var(--ok)' }}
                              disabled={approveLoading === m.user_id}
                              onClick={() => handleApprove(m.user_id)}
                            >
                              {approveLoading === m.user_id ? '…' : 'Aprovar'}
                            </button>
                          )}
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={removeLoading === m.user_id}
                            onClick={() => handleRemove(m.user_id)}
                          >
                            {removeLoading === m.user_id ? '…' : 'Remover'}
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
