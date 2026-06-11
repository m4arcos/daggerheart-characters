import { useState, useEffect } from 'react';
import { api } from '../api';
import ImageUpload from '../components/ImageUpload';
import LinkCharModal from '../components/LinkCharModal';
import Modal from '../components/Modal';
import { CampaignDetail } from '../types/campaign';
import { Character } from '../types/character';
import { CLS } from '../constants/cls';
import { useAuthStore } from '../store/useAuthStore';
import { useCharStore } from '../store/useCharStore';

type CampaignStatus = 'ativa' | 'pausada' | 'arquivada';

const STATUS_LABEL: Record<CampaignStatus, string> = { ativa: 'ATIVA', pausada: 'PAUSADA', arquivada: 'ARQUIVADA' };
const STATUS_COLOR: Record<CampaignStatus, string> = {
  ativa:     'var(--ok)',
  pausada:   'var(--hope)',
  arquivada: 'var(--text-dim)',
};

function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const color = STATUS_COLOR[status] ?? 'var(--text-dim)';
  return (
    <span className="camp-detail-status-badge" style={{ color, borderColor: color }}>
      {STATUS_LABEL[status] ?? status.toUpperCase()}
    </span>
  );
}

function StatusControls({ status, onSet }: { status: CampaignStatus; onSet: (s: CampaignStatus) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {status !== 'ativa' && (
        <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => onSet('ativa')}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>play_circle</span>
          Ativar
        </button>
      )}
      {status === 'ativa' && (
        <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => onSet('pausada')}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>pause_circle</span>
          Pausar
        </button>
      )}
      {status !== 'arquivada' && (
        <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => onSet('arquivada')}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>archive</span>
          Arquivar
        </button>
      )}
    </div>
  );
}

function MemberStatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    ativo:    ['ATIVO',    'var(--ok)'],
    aprovado: ['APROVADO', 'var(--accent)'],
    pendente: ['PENDENTE', 'var(--hope)'],
  };
  const [label, color] = map[status] ?? [status.toUpperCase(), 'var(--text-dim)'];
  return (
    <span className="camp-member-status-badge" style={{ color, borderColor: color }}>{label}</span>
  );
}

function avatarColor(name: string): string {
  const colors = ['#3a3254', '#2d4a3e', '#4a2d2d', '#2d3a4a', '#4a3d2d', '#3d2d4a'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

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
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [removeCharTarget, setRemoveCharTarget] = useState<{ id: string; nome: string } | null>(null);
  const [removeCharLoading, setRemoveCharLoading] = useState(false);

  const allChars = useCharStore(s => s.chars);
  const patchChar = useCharStore(s => s.patchChar);
  const linkedIds = new Set(chars.map(c => c.id));
  // Chars disponíveis para vincular (sem vínculo)
  const linkableChars = allChars.filter(c => !c.campaign_id && !linkedIds.has(c.id));
  // Todos os chars do usuário exceto os já presentes nessa campanha (inclui os bloqueados por outra)
  const allLinkableOrBlocked = allChars.filter(c => !linkedIds.has(c.id));

  const [expandedAttrs, setExpandedAttrs] = useState<Set<string>>(new Set());
  const toggleAttrs = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedAttrs(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const clsGradient: Record<string, string> = {
    bardo:       'linear-gradient(135deg, rgba(197,95,160,.22) 0%, rgba(107,127,196,.14) 100%)',
    druida:      'linear-gradient(135deg, rgba(46,204,113,.18) 0%, rgba(74,154,186,.1) 100%)',
    feiticeiro:  'linear-gradient(135deg, rgba(155,111,196,.24) 0%, rgba(107,127,196,.18) 100%)',
    guardiao:    'linear-gradient(135deg, rgba(74,154,186,.2) 0%, rgba(46,204,113,.1) 100%)',
    guerreiro:   'linear-gradient(135deg, rgba(224,80,80,.2) 0%, rgba(200,130,50,.1) 100%)',
    ladino:      'linear-gradient(135deg, rgba(40,35,58,.7) 0%, rgba(30,28,45,.4) 100%)',
    mago:        'linear-gradient(135deg, rgba(74,154,186,.18) 0%, rgba(155,111,196,.14) 100%)',
    patrulheiro: 'linear-gradient(135deg, rgba(46,204,113,.15) 0%, rgba(200,170,90,.1) 100%)',
    serafim:     'linear-gradient(135deg, rgba(200,170,90,.2) 0%, rgba(224,148,48,.12) 100%)',
  };

  const attrLabels: [keyof Character, string][] = [
    ['agi', 'AGI'], ['for', 'FOR'], ['acu', 'ACU'],
    ['ins', 'INS'], ['pre', 'PRE'], ['con', 'CON'],
  ];

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

  async function handleLinkChars(_campId: string, charIds: string[]) {
    for (const id of charIds) {
      await patchChar(id, { campaign_id: campaignId });
    }
    await loadChars();
  }

  async function handleRemoveChar() {
    if (!removeCharTarget) return;
    setRemoveCharLoading(true);
    try {
      await patchChar(removeCharTarget.id, { campaign_id: null });
      await loadChars();
      setRemoveCharTarget(null);
    } finally {
      setRemoveCharLoading(false);
    }
  }

  async function handleSetStatus(status: 'ativa' | 'pausada' | 'arquivada') {
    if (!campaign) return;
    try {
      await api.campaigns.updateStatus(campaignId, status);
      setCampaign(prev => prev ? { ...prev, status } : prev);
    } catch { /* silent */ }
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

  const pendingCount = campaign.membros.filter(m => m.status === 'pendente').length;

  return (
    <div className="camp-detail-wrap">
      {/* ── HEADER ── */}
      <div className="camp-detail-header">
        {campaign.cover_image && (
          <>
            <img className="camp-detail-cover-img" src={campaign.cover_image} alt="Capa" />
            <div className="camp-detail-cover-overlay" />
          </>
        )}

        <div className="camp-detail-header-content">
          {/* Meta row: status + members + status controls */}
          <div className="camp-detail-meta-row">
            <CampaignStatusBadge status={campaign.status ?? 'ativa'} />
            <span className="camp-detail-member-count">
              • {campaign.total_membros} MEMBRO{campaign.total_membros !== 1 ? 'S' : ''}
            </span>
            {isCreator && (
              <div style={{ marginLeft: 'auto' }}>
                <StatusControls status={campaign.status ?? 'ativa'} onSet={handleSetStatus} />
              </div>
            )}
          </div>

          {/* Title row */}
          <div className="camp-detail-title-row">
            <h1 className="camp-detail-title">{campaign.nome}</h1>
            {isCreator && (
              <div className="camp-detail-code-card">
                <div className="camp-detail-code-label">CÓDIGO DE CONVITE</div>
                <div className="camp-detail-code-row">
                  <span className="camp-detail-code">{campaign.codigo}</span>
                  <button className="btn btn-ghost btn-sm" onClick={copyCode} style={{ padding: '3px 6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      {copied ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* GM row */}
          <div className="camp-detail-gm-row">
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--accent)' }}>shield_person</span>
            <span className="camp-detail-gm-label">GM:</span>
            <span className="camp-detail-gm-name">{campaign.criador_nome}</span>
            {isCreator && (
              <div style={{ marginLeft: 'auto' }}>
                <ImageUpload
                  value={campaign.cover_image}
                  shape="square"
                  size={30}
                  placeholder="add_photo_alternate"
                  onChange={async url => {
                    await api.campaigns.updateCover(campaignId, url);
                    setCampaign(prev => prev ? { ...prev, cover_image: url } : prev);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="camp-detail-tabs">
        <button
          className={`camp-detail-tab${activeTab === 'personagens' ? ' active' : ''}`}
          onClick={() => setActiveTab('personagens')}
        >
          PERSONAGENS
        </button>
        <button
          className={`camp-detail-tab${activeTab === 'membros' ? ' active' : ''}`}
          onClick={() => setActiveTab('membros')}
        >
          MEMBROS
          {pendingCount > 0 && (
            <span className="camp-tab-badge">{pendingCount}</span>
          )}
        </button>
      </div>

      {/* ── ABA: PERSONAGENS ── */}
      {activeTab === 'personagens' && (
        <div className="camp-detail-tab-content">
          <div className="camp-chars-header">
            <h3 className="camp-section-title">Heróis da Campanha</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {allLinkableOrBlocked.length > 0 && (
                <button className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.75rem', fontWeight: 700, letterSpacing: '.08em' }} onClick={() => setLinkModalOpen(true)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>link</span>
                  VINCULAR PERSONAGEM
                </button>
              )}
              <button className="btn btn-primary btn-sm" onClick={() => onNewChar(campaignId)}>+ Criar Personagem</button>
            </div>
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
                const heroGradient = clsGradient[c.cls] ?? 'linear-gradient(135deg, rgba(200,170,90,.15) 0%, transparent 100%)';
                const pvPct = c.pvMax > 0 ? Math.min(100, Math.round(c.pvAtual / c.pvMax * 100)) : 0;
                const pfPct = c.pfMax > 0 ? Math.min(100, Math.round(c.pfAtual / c.pfMax * 100)) : 0;
                const hopePct = Math.min(100, Math.round(c.esperanca / 6 * 100));
                const attrsOpen = expandedAttrs.has(c.id);
                return (
                  <div key={c.id} className="char-card" onClick={() => isOwner ? onViewChar(c.id) : onViewOtherChar(c)}>
                    {/* Hero area */}
                    <div className="char-hero-area" style={{ background: heroGradient }}>
                      {c.avatar && (
                        <img src={c.avatar} alt={c.nome} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                      )}
                      <div className="level-badge">LVL {c.nivel}</div>
                    </div>

                    {/* Dono + badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: '.7rem', color: 'var(--text-dim)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>person</span>
                      <span>{c._owner?.nome ?? '—'}</span>
                      {c.privado && (
                        <span style={{ marginLeft: 'auto', background: 'var(--surface3)', borderRadius: 3, padding: '1px 5px', fontSize: '.65rem' }}>Privado</span>
                      )}
                    </div>

                    <div className="cc-cls">{cls.nome} — Nível {c.nivel}</div>
                    <div className="cc-name">{c.nome}</div>
                    <div className="cc-sub">{c.heranca}{c.subclasse ? ` · ${c.subclasse}` : ''}</div>

                    {/* Stat bars */}
                    <div className="char-stat-bars">
                      <div className="char-stat-bar-row">
                        <div className="char-stat-bar-head">
                          <span className="char-stat-bar-lbl">Pontos de Vida</span>
                          <span className="char-stat-bar-val hp">{c.pvAtual}/{c.pvMax}</span>
                        </div>
                        <div className="char-stat-bar-track"><div className="char-stat-bar-fill hp" style={{ width: `${pvPct}%` }} /></div>
                      </div>
                      <div className="char-stat-bar-row">
                        <div className="char-stat-bar-head">
                          <span className="char-stat-bar-lbl">Fadiga</span>
                          <span className="char-stat-bar-val fp">{c.pfAtual}/{c.pfMax}</span>
                        </div>
                        <div className="char-stat-bar-track"><div className="char-stat-bar-fill fp" style={{ width: `${pfPct}%` }} /></div>
                      </div>
                      <div className="char-stat-bar-row">
                        <div className="char-stat-bar-head">
                          <span className="char-stat-bar-lbl">Esperança</span>
                          <span className="char-stat-bar-val hope">{c.esperanca}/6</span>
                        </div>
                        <div className="char-stat-bar-track"><div className="char-stat-bar-fill hope" style={{ width: `${hopePct}%` }} /></div>
                      </div>
                    </div>

                    {/* Limiares + Evasão */}
                    <div className="cc-thresholds" onClick={e => e.stopPropagation()}>
                      <span className="cc-threshold-item ev">
                        <span className="cc-threshold-lbl">Evasão</span>
                        <span className="cc-threshold-val">{(CLS[c.cls]?.ev ?? 0) + (c.evBonus || 0)}</span>
                      </span>
                      <span className="cc-threshold-sep">·</span>
                      <span className="cc-threshold-item minor">
                        <span className="cc-threshold-lbl">Menor</span>
                        <span className="cc-threshold-val">{c.dm}</span>
                      </span>
                      <span className="cc-threshold-sep">›</span>
                      <span className="cc-threshold-item grave">
                        <span className="cc-threshold-lbl">Grave</span>
                        <span className="cc-threshold-val">{c.dG}</span>
                      </span>
                    </div>

                    {/* Atributos colapsáveis */}
                    {attrsOpen && (
                      <div className="cc-attrs" onClick={e => e.stopPropagation()}>
                        {attrLabels.map(([key, lbl]) => {
                          const val = c[key] as number;
                          return (
                            <div key={lbl} className="cc-attr-box">
                              <span className="cc-attr-lbl">{lbl}</span>
                              <span className={`cc-attr-val ${val > 0 ? 'pos' : val < 0 ? 'neg' : 'zero'}`}>
                                {val > 0 ? `+${val}` : val}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="cc-acts" onClick={e => e.stopPropagation()}>
                      {isOwner ? (
                        <>
                          <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => onViewChar(c.id)}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden="true">play_arrow</span>
                            Ver Ficha
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => onEditChar(c.id)}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden="true">edit</span>
                            Editar
                          </button>
                        </>
                      ) : (
                        <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => onViewOtherChar(c)}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden="true">visibility</span>
                          Ver Ficha
                        </button>
                      )}
                      <button className={`btn btn-sm ${attrsOpen ? 'btn-primary' : 'btn-ghost'}`} onClick={e => toggleAttrs(c.id, e)} title="Atributos" style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden="true">bar_chart</span>
                      </button>
                      {(isOwner || isCreator) && (
                        <button
                          className="btn btn-danger btn-sm"
                          title="Remover da campanha"
                          onClick={e => { e.stopPropagation(); setRemoveCharTarget({ id: c.id, nome: c.nome }); }}
                          style={{ display: 'flex', alignItems: 'center' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden="true">link_off</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ABA: MEMBROS ── */}
      {activeTab === 'membros' && (
        <div className="camp-detail-tab-content">
          <h3 className="camp-section-title" style={{ marginBottom: 20 }}>Gerenciamento de Jogadores</h3>

          <div className="camp-members-table">
            {/* Header */}
            <div className="camp-members-thead">
              <div className="cmt-col nome">NOME</div>
              <div className="cmt-col email">EMAIL</div>
              <div className="cmt-col status">STATUS</div>
              <div className="cmt-col acoes">AÇÕES</div>
            </div>

            {campaign.membros.map(m => {
              const isMestre = m.user_id === campaign.criador_id;
              const isMe = m.user_id === userId;
              const roleLabel = isMestre ? 'CRIADOR' : m.status === 'aprovado' ? 'JOGADOR' : 'CONVIDADO';
              const memberStatus = isMestre ? 'ativo' : m.status;
              const initial = m.nome.charAt(0).toUpperCase();
              return (
                <div key={m.user_id} className="camp-members-row">
                  <div className="cmt-col nome">
                    <div className="cmt-avatar" style={{ background: avatarColor(m.nome) }}>{initial}</div>
                    <div className="cmt-member-info">
                      <div className="cmt-member-name">{m.nome}</div>
                      <div className="cmt-member-tags">
                        {isMestre && <span className="cmt-tag-mestre">MESTRE</span>}
                        <span className="cmt-role">{roleLabel}</span>
                        {isMe && !isMestre && <span className="cmt-role" style={{ color: 'var(--accent)' }}>· você</span>}
                      </div>
                    </div>
                  </div>
                  <div className="cmt-col email">{m.email}</div>
                  <div className="cmt-col status">
                    <MemberStatusBadge status={memberStatus} />
                  </div>
                  <div className="cmt-col acoes">
                    {isMestre ? (
                      <span className="cmt-action-owner">PROPRIETÁRIO</span>
                    ) : isCreator ? (
                      <div style={{ display: 'flex', gap: 14 }}>
                        {m.status === 'pendente' && (
                          <button className="cmt-action approve" disabled={approveLoading === m.user_id} onClick={() => handleApprove(m.user_id)}>
                            {approveLoading === m.user_id ? '…' : 'APROVAR'}
                          </button>
                        )}
                        <button className="cmt-action remove" disabled={removeLoading === m.user_id} onClick={() => handleRemove(m.user_id)}>
                          {removeLoading === m.user_id ? '…' : 'REMOVER'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {linkModalOpen && (
        <LinkCharModal
          campaignId={campaignId}
          campaignNome={campaign?.nome}
          chars={allLinkableOrBlocked}
          onLink={handleLinkChars}
          onClose={() => setLinkModalOpen(false)}
        />
      )}

      {removeCharTarget && (
        <Modal
          title="Remover personagem da campanha?"
          message={`"${removeCharTarget.nome}" será desvinculado desta campanha. O personagem não será excluído.`}
          confirmLabel={removeCharLoading ? 'Removendo…' : 'Remover'}
          onConfirm={handleRemoveChar}
          onClose={() => setRemoveCharTarget(null)}
        />
      )}
    </div>
  );
}
