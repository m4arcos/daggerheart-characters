import { useState, useEffect } from 'react';
import { useCharStore } from '../store/useCharStore';
import { useAuthStore } from '../store/useAuthStore';
import { CLS } from '../constants/cls';
import { MULTI } from '../constants/multi';
import Modal from '../components/Modal';
import { api } from '../api';
import { Campaign } from '../types/campaign';

interface Props {
  onNew: () => void;
  onEdit: (id: string) => void;
  onSession: (id: string) => void;
  onCampaign: (id: string) => void;
}

export default function ListScreen({ onNew, onEdit, onSession, onCampaign }: Props) {
  const chars = useCharStore(s => s.chars);
  const charOwners = useCharStore(s => s.charOwners);
  const deleteChar = useCharStore(s => s.deleteChar);
  const patchChar = useCharStore(s => s.patchChar);
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.isAdmin ?? false;

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);
  const [expandedAttrs, setExpandedAttrs] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const toggleAttrs = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedAttrs(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuId]);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  useEffect(() => {
    api.campaigns.list().then(setCampaigns).catch(() => setCampaigns([]));
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteChar(deleteTarget.id);
    setDeleteTarget(null);
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

  return (
    <div className="list-wrap">
      {campaigns.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, borderLeft: '2px solid var(--accent)', paddingLeft: 8 }}>
              Minhas Campanhas
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {campaigns.map(cp => (
              <div
                key={cp.id}
                onClick={() => onCampaign(cp.id)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r)',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  minWidth: 160,
                  flex: '1 1 160px',
                  maxWidth: 280,
                  transition: 'border-color .2s, box-shadow .2s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(200,170,90,.55)';
                  e.currentTarget.style.boxShadow = '0 0 16px rgba(200,170,90,.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: '.92rem', letterSpacing: '-0.01em' }}>{cp.nome}</div>
                  {cp.total_pendentes > 0 && (
                    <span style={{ background: 'var(--hope)', color: '#12111a', borderRadius: 10, padding: '1px 7px', fontSize: '.68rem', fontWeight: 800, flexShrink: 0, marginLeft: 6 }}>
                      {cp.total_pendentes}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-dim)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 12, marginRight: 3, verticalAlign: 'middle' }}>groups</span>
                  {cp.total_membros} membro{cp.total_membros !== 1 ? 's' : ''}
                  {' · '}
                  <span style={{ color: cp.meu_status === 'pendente' ? 'var(--hope)' : cp.criador_id === user?.userId ? 'var(--accent)' : 'var(--ok)' }}>
                    {cp.criador_id === user?.userId ? 'Mestre' : cp.meu_status === 'aprovado' ? 'Jogador' : 'Pendente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="list-top">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.8rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person</span>
          {chars.length} {chars.length !== 1 ? 'personagens' : 'personagem'}
        </h2>
        <button className="btn btn-primary" onClick={onNew} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">person_add</span>
          + Novo Personagem
        </button>
      </div>

      {chars.length === 0 ? (
        <div className="empty-state">
          <div style={{ marginBottom: 16 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--border)', display: 'block' }}>person_off</span>
          </div>
          <h3>Nenhum personagem ainda</h3>
          <p>Crie seu primeiro personagem para começar sua saga.</p>
          <button className="btn btn-primary" onClick={onNew} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">person_add</span>
            + Criar Personagem
          </button>
        </div>
      ) : (
        <div className="char-grid">
          {chars.map(c => {
            const cls = CLS[c.cls] || { nome: c.cls };
            const owner = charOwners[c.id];
            const heroGradient = clsGradient[c.cls] ?? 'linear-gradient(135deg, rgba(200,170,90,.15) 0%, transparent 100%)';
            const attrsOpen = expandedAttrs.has(c.id);
            const attrLabels: [keyof typeof c, string][] = [
              ['agi', 'AGI'], ['for', 'FOR'], ['acu', 'ACU'],
              ['ins', 'INS'], ['pre', 'PRE'], ['con', 'CON'],
            ];
            return (
              <div key={c.id} className="char-card" onClick={() => onSession(c.id)}>
                {/* Hero artwork area */}
                <div className="char-hero-area" style={{ background: heroGradient }}>
                  {c.avatar && (
                    <img
                      src={c.avatar}
                      alt={c.nome}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                    />
                  )}
                  <div className="level-badge">LVL {c.nivel}</div>
                </div>

                {isAdmin && owner && (
                  <div style={{ fontSize: '.7rem', color: 'var(--text-dim)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>person</span>
                    {owner.nome}
                  </div>
                )}
                <div className="cc-cls">{cls.nome} — Nível {c.nivel}</div>
                <div className="cc-name">{c.nome}</div>
                <div className="cc-sub">
                  {[
                    c.heranca,
                    c.comunidade,
                    c.subclasse,
                    c.multiEnabled && c.multiCls ? `${MULTI[c.multiCls]?.nome ?? c.multiCls}` : null,
                  ].filter(Boolean).join(' · ')}
                </div>
                {c.armNome && (
                  <div className="cc-armor-name" onClick={e => e.stopPropagation()}>
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>shield</span>
                    {c.armNome}
                  </div>
                )}

                {/* Stat counters */}
                <div className="cc-stats" onClick={e => e.stopPropagation()}>
                  {[
                    { lbl: 'PV',  cur: c.pvAtual,   max: c.pvMax,   key: 'pvAtual',   cls: 'hp'   },
                    { lbl: 'PF',  cur: c.pfAtual,   max: c.pfMax,   key: 'pfAtual',   cls: 'fp'   },
                    { lbl: '✦',   cur: c.esperanca, max: 6,         key: 'esperanca', cls: 'hope' },
                    ...(c.armBase > 0 ? [{ lbl: 'PA', cur: c.paAtual, max: c.armBase, key: 'paAtual', cls: 'pa' }] : []),
                  ].map(({ lbl, cur, max, key, cls }) => {
                    const pct = max > 0 ? Math.min(100, Math.round(cur / max * 100)) : 0;
                    return (
                      <div key={key} className="cc-stat-row">
                        <div className="cc-stat-head">
                          <span className={`cc-stat-lbl ${cls}`}>{lbl}</span>
                          <span className="cc-stat-val">
                            <span className={cls}>{cur}</span>
                            <span className="cc-stat-max">/{max}</span>
                          </span>
                        </div>
                        <div className="cc-stat-bar-row">
                          <button
                            className="cc-stat-btn"
                            onClick={e => { e.stopPropagation(); patchChar(c.id, { [key]: Math.max(0, cur - 1) }); }}
                            disabled={cur <= 0}
                          >−</button>
                          <div className="cc-stat-track">
                            <div className={`cc-stat-fill ${cls}`} style={{ width: `${pct}%` }} />
                          </div>
                          <button
                            className="cc-stat-btn"
                            onClick={e => { e.stopPropagation(); patchChar(c.id, { [key]: Math.min(max, cur + 1) }); }}
                            disabled={cur >= max}
                          >+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Limiares de dano + Evasão */}
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
                  <button className="btn btn-primary btn-sm" onClick={() => onSession(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden="true">play_arrow</span>
                    Ver Ficha
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => onEdit(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden="true">edit</span>
                    Editar
                  </button>
                  <button className={`btn btn-sm ${attrsOpen ? 'btn-primary' : 'btn-ghost'}`} onClick={e => toggleAttrs(c.id, e)} title="Atributos" style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden="true">bar_chart</span>
                  </button>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      title="Mais opções"
                      onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === c.id ? null : c.id); }}
                      style={{ display: 'flex', alignItems: 'center' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">more_vert</span>
                    </button>
                    {openMenuId === c.id && (
                      <div className="char-kebab-menu">
                        <button
                          className="char-kebab-item danger"
                          onClick={e => { e.stopPropagation(); setOpenMenuId(null); setDeleteTarget({ id: c.id, nome: c.nome }); }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Dashed create card */}
          <button className="char-create-card" onClick={onNew}>
            <span className="material-symbols-outlined char-create-card-icon" aria-hidden="true">person_add</span>
            <span style={{ fontSize: '.88rem', fontWeight: 600 }}>Criar Novo Personagem</span>
            <span style={{ fontSize: '.75rem' }}>Adicione um novo herói à sua saga</span>
          </button>
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
