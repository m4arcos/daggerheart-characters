import { useState, useEffect } from 'react';
import { useCharStore } from '../store/useCharStore';
import NumInput from '../components/NumInput';
import { Character, InvEntry, tierFromLevel } from '../types/character';
import { CLS } from '../constants/cls';
import { MULTI } from '../constants/multi';
import { api } from '../api';
import { Card, DOMAIN_NAME_TO_KEY } from '../types/cards';

interface Props {
  charId: string;
  onEdit: (id: string) => void;
}

export default function SessionScreen({ charId, onEdit }: Props) {
  const chars = useCharStore(s => s.chars);
  const patchChar = useCharStore(s => s.patchChar);
  const showNotif = useCharStore(s => s.showNotif);

  const c = chars.find(x => x.id === charId);
  const [newInvNome, setNewInvNome] = useState('');
  const [newInvQtd, setNewInvQtd] = useState(1);
  const [newInvDesc, setNewInvDesc] = useState('');
  const [allSelectedCards, setAllSelectedCards] = useState<Card[]>([]);
  const [multiSubclasseCard, setMultiSubclasseCard] = useState<Card | null>(null);

  const cartasKey = (c?.cartasDominio ?? []).join(',');
  useEffect(() => {
    if (!c?.cls) { setAllSelectedCards([]); return; }
    const domKeys = [...new Set([
      ...(MULTI[c.cls]?.doms ?? []).map(d => DOMAIN_NAME_TO_KEY[d]).filter(Boolean),
      ...(c.multiEnabled && c.multiDom ? [DOMAIN_NAME_TO_KEY[c.multiDom]].filter(Boolean) : []),
    ])];
    if (!domKeys.length || !c.cartasDominio?.length) { setAllSelectedCards([]); return; }
    Promise.all(domKeys.map(k => api.cards.getAll({ tipo: 'dominio', dominio_key: k })))
      .then(results => {
        const all = results.flat();
        setAllSelectedCards(all.filter(card => c.cartasDominio!.includes(card.num))
          .sort((a, b) => (a.nivel_dominio ?? 0) - (b.nivel_dominio ?? 0)));
      });
  }, [c?.id, cartasKey, c?.multiEnabled, c?.multiDom]);

  const multiKey = `${c?.multiEnabled}-${c?.multiCls}-${c?.multiSubclasse}`;
  useEffect(() => {
    if (!c?.multiEnabled || !c?.multiCls || !c?.multiSubclasse) { setMultiSubclasseCard(null); return; }
    api.cards.getAll({ tipo: 'subclasse', classe: c.multiCls })
      .then(cards => {
        const fund = cards.find(card =>
          card.subclasse_nome === c.multiSubclasse && card.nivel_subclasse === 'Fundamental'
        );
        setMultiSubclasseCard(fund ?? null);
      })
      .catch(() => setMultiSubclasseCard(null));
  }, [c?.id, multiKey]);

  if (!c) return <div style={{ padding: 20, color: 'var(--text-dim)' }}>Personagem não encontrado.</div>;

  const cls = CLS[c.cls] || { nome: c.cls, sub: '', ev: 10, ha: '', habs: [] };
  const ev = cls.ev + (c.evBonus || 0);
  const multiData = c.multiEnabled && c.multiCls ? MULTI[c.multiCls] : null;
  const cartasAtivas = c.cartasAtivas ?? [];
  const naMAo = allSelectedCards.filter(card => cartasAtivas.includes(card.num));
  const reserva = allSelectedCards.filter(card => !cartasAtivas.includes(card.num));

  const patch = (p: Partial<Character>) => patchChar(c.id, p);

  const toggleBox = (field: 'pvAtual' | 'pfAtual' | 'paAtual', max: number, boxIdx: number) => {
    const current = c[field] ?? max;
    const marked = max - current;
    const newMarked = boxIdx < marked ? boxIdx : boxIdx + 1;
    patch({ [field]: max - newMarked });
  };

  const toggleHope = (i: number) => {
    const cur = c.esperanca ?? 6;
    patch({ esperanca: i < cur ? i : i + 1 });
  };

  const toggleCartaAtiva = (num: number) => {
    const ativas = c.cartasAtivas ?? [];
    patch({ cartasAtivas: ativas.includes(num) ? ativas.filter(n => n !== num) : [...ativas, num] });
  };

  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const toggleExpand = (num: number) =>
    setExpandedCards(s => { const n = new Set(s); n.has(num) ? n.delete(num) : n.add(num); return n; });

  const addInv = () => {
    const nome = newInvNome.trim();
    if (!nome) { showNotif('Informe o nome do item!'); return; }
    const updated = [...(c.inv || []), { nome, qtd: newInvQtd, desc: newInvDesc.trim() }];
    patch({ inv: updated });
    setNewInvNome(''); setNewInvQtd(1); setNewInvDesc('');
    showNotif('Item adicionado!');
  };

  const removeInv = (idx: number) => {
    patch({ inv: c.inv.filter((_, i) => i !== idx) });
  };

  const updateInvQtd = (idx: number, qtd: number) => {
    const updated = c.inv.map((it, i) => i === idx ? { ...it, qtd: Math.max(0, qtd) } : it);
    patch({ inv: updated });
  };

  return (
    <div className="sess-wrap">
      <div className="sess-lay">
        {/* ── LEFT ── */}
        <div>
          {/* Character Header */}
          <div className="char-hdr">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div>
                <div className="char-hdr-name">{c.nome}</div>
                <div className="char-hdr-meta">
                  <span><strong>{cls.nome}</strong>{c.subclasse ? ` · ${c.subclasse}` : ''}</span>
                  <span>Nível <strong>{c.nivel}</strong> <span style={{ color: 'var(--border)' }}>·</span> <strong>{tierFromLevel(c.nivel)}</strong></span>
                  <span>{c.heranca}{c.comunidade ? ` · ${c.comunidade}` : ''}{c.genero ? ` · ${c.genero}` : ''}</span>
                  {multiData && (
                    <span style={{ color: 'var(--hope)' }}>
                      ✦ Multiclasse: <strong style={{ color: 'var(--hope)' }}>{multiData.nome}</strong>
                      {c.multiDom ? ` · ${c.multiDom}` : ''}
                    </span>
                  )}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={() => onEdit(c.id)}>✏ Editar</button>
            </div>
          </div>

          {/* Saúde & Dano */}
          <div className="ss">
            <div className="ss-hdr">Saúde & Dano</div>
            <div className="ss-body">
              <p style={{ fontSize: '.65rem', color: 'var(--text-dim)', textAlign: 'center', marginBottom: 8 }}>
                Some seu nível atual aos seus limiares de dano.
              </p>
              <div className="dmg-flow">
                <div className="dmg-type dm"><div className="dmg-type-lbl">Dano Menor</div><div className="dmg-type-sub">Marque 1 PV</div></div>
                <div className="dmg-sep"><div className="dmg-sep-val">{c.dm || '—'}</div><div className="dmg-sep-arr">▶</div></div>
                <div className="dmg-type dM"><div className="dmg-type-lbl">Dano Maior</div><div className="dmg-type-sub">Marque 2 PV</div></div>
                <div className="dmg-sep"><div className="dmg-sep-val">{c.dG || '—'}</div><div className="dmg-sep-arr">▶</div></div>
                <div className="dmg-type dG"><div className="dmg-type-lbl">Dano Grave</div><div className="dmg-type-sub">Marque 3 PV</div></div>
              </div>

              <TrackBoxes
                label="Pontos de Vida" type="hp"
                max={c.pvMax} current={c.pvAtual ?? c.pvMax}
                onToggle={i => toggleBox('pvAtual', c.pvMax, i)}
                testIdPrefix="pv"
              />
              <TempRow label="PV Temporário" value={c.pvTemp || 0} onChange={v => patch({ pvTemp: v })} />

              <div style={{ marginTop: 10 }}>
                <TrackBoxes
                  label="Pontos de Fadiga" type="fp"
                  max={c.pfMax} current={c.pfAtual ?? c.pfMax}
                  onToggle={i => toggleBox('pfAtual', c.pfMax, i)}
                  testIdPrefix="pf"
                />
              </div>
              <TempRow label="PF Temporário" value={c.pfTemp || 0} onChange={v => patch({ pfTemp: v })} />
            </div>
          </div>

          {/* Esperança */}
          <div className="ss">
            <div className="ss-hdr">Esperança</div>
            <div className="ss-body">
              <div className="gems">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className={`gem${i < (c.esperanca ?? 6) ? ' on' : ''}`}
                       onClick={() => toggleHope(i)} data-testid="hope-gem">✦</div>
                ))}
              </div>
              <TempRow label="Esperança Temporária" value={c.hopeTemp || 0} onChange={v => patch({ hopeTemp: v })} />
              <div className="hope-ab" style={{ marginTop: 8 }}>{cls.ha}</div>
            </div>
          </div>

          {/* Atributos */}
          <div className="ss">
            <div className="ss-hdr">Atributos</div>
            <div className="ss-body">
              <div className="attr-disp">
                {([
                  ['Agilidade', c.agi, c.agiUp],
                  ['Força', c.for, c.forUp],
                  ['Acuidade', c.acu, c.acuUp],
                  ['Instinto', c.ins, c.insUp],
                  ['Presença', c.pre, c.preUp],
                  ['Conhecimento', c.con, c.conUp],
                ] as [string, number, boolean][]).map(([label, val, up]) => {
                  const n = val || 0;
                  const cl = n > 0 ? 'pos' : n < 0 ? 'neg' : 'zer';
                  return (
                    <div key={label} className={`abox${up ? ' upgraded' : ''}`}>
                      <div className="abox-lbl">{label}</div>
                      <div className={`abox-val ${cl}`}>{n >= 0 ? '+' : ''}{n}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Experiências */}
          {c.exps && c.exps.length > 0 && (
            <div className="ss">
              <div className="ss-hdr">Experiências</div>
              <div className="ss-body">
                {c.exps.map((e, i) => (
                  <div key={i} className="exp-dr">
                    <span>{e.nome}</span>
                    <span className="exp-mod">{e.val >= 0 ? '+' : ''}{e.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ouro */}
          <div className="ss">
            <div className="ss-hdr">Ouro</div>
            <div className="ss-body">
              <div className="gold-row">
                {(['gP', 'gB', 'gBau'] as const).map((field, i) => {
                  const labels = ['Punhados', 'Bolsas', 'Baú'];
                  return (
                    <div key={field} className="gold-box">
                      <div className="gold-lbl">{labels[i]}</div>
                      <NumInput
                        className="gold-in" inputMode="numeric" min={0} step={1} value={c[field] || 0}
                        onChange={v => patch({ [field]: v })}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div>
          {/* Evasão & Armadura */}
          <div className="ss">
            <div className="ss-hdr">Evasão & Proficiência</div>
            <div className="ss-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div className="stat-big">
                  <div className="stat-big-lbl">Evasão</div>
                  <div className="stat-big-val ev-val" data-testid="ev-val">{ev}</div>
                </div>
                <div className="stat-big">
                  <div className="stat-big-lbl">Proficiência</div>
                  <div className="prof-row" style={{ justifyContent: 'center', marginTop: 6 }}>
                    {Array.from({ length: 6 }, (_, i) => (
                      <div key={i} className={`pbox${i < (c.prof || 1) ? ' on' : ''}`} title="Proficiência" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Armas Ativas */}
          <div className="ss">
            <div className="ss-hdr">Armas Ativas</div>
            <div className="ss-body">
              <WeaponDisplay type="Principal" nome={c.wpNome} attr={c.wpAttr} dados={c.wpDados} hab={c.wpHab} maos={c.wpMaos} prof={c.prof} />
              <WeaponDisplay type="Secundária" nome={c.wsNome} attr={c.wsAttr} dados={c.wsDados} hab={c.wsHab} maos={c.wsMaos} prof={c.prof} />
            </div>
          </div>

          {/* Armadura */}
          <div className="ss">
            <div className="ss-hdr">Armadura Ativa</div>
            <div className="ss-body">
              {c.armNome ? (
                <div className="wd">
                  <div className="wd-name">{c.armNome}</div>
                  {c.armLim && <div className="wd-meta">Limiares: {c.armLim}</div>}
                  {c.armHab && <div className="wd-skill">{c.armHab}</div>}
                </div>
              ) : (
                <p style={{ color: 'var(--text-dim)', fontSize: '.82rem' }}>Sem armadura equipada.</p>
              )}
              {(c.armBase > 0) && (
                <>
                  <TrackBoxes
                    label="Pontos de Armadura" type="ar"
                    max={c.armBase} current={c.paAtual ?? c.armBase}
                    onToggle={i => toggleBox('paAtual', c.armBase, i)}
                    testIdPrefix="pa"
                  />
                  <TempRow label="PA Temporário" value={c.paTemp || 0} onChange={v => patch({ paTemp: v })} />
                </>
              )}
            </div>
          </div>

          {/* Inventário */}
          <div className="ss">
            <div className="ss-hdr">Inventário</div>
            <div className="ss-body">
              {c.inv && c.inv.length > 0 && (
                <ul className="inv-disp">
                  {c.inv.map((item: InvEntry, idx: number) => (
                    <li key={idx} data-testid="inv-item">
                      <div className="inv-item-info">
                        <div className="inv-item-name">
                          {item.nome}
                          <span className="inv-item-qtd">×{item.qtd}</span>
                        </div>
                        {item.desc && <div className="inv-item-desc">{item.desc}</div>}
                      </div>
                      <NumInput
                        inputMode="numeric" min={0} step={1} value={item.qtd}
                        style={{ width: 52, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', padding: '4px 6px', fontSize: '.82rem', textAlign: 'center', flexShrink: 0 }}
                        onChange={v => updateInvQtd(idx, v)}
                      />
                      <button className="inv-del-btn" onClick={() => removeInv(idx)}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
              {c.wi1Nome && <WeaponDisplay type={`Inventário — ${c.wi1Tipo || ''}`} nome={c.wi1Nome} attr={c.wi1Attr} dados={c.wi1Dados} hab={c.wi1Hab} maos={c.wi1Maos} prof={c.prof} />}
              {c.wi2Nome && <WeaponDisplay type={`Inventário — ${c.wi2Tipo || ''}`} nome={c.wi2Nome} attr={c.wi2Attr} dados={c.wi2Dados} hab={c.wi2Hab} maos={c.wi2Maos} prof={c.prof} />}

              <div className="inv-add-form">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10, marginBottom: 8 }}>
                  <div className="fg"><label>Nome do item</label>
                    <input type="text" value={newInvNome} placeholder="Ex: Poção de Vida…" onChange={e => setNewInvNome(e.target.value)} />
                  </div>
                  <div className="fg"><label>Quantidade</label>
                    <NumInput inputMode="numeric" min={1} step={1} fallback={1} value={newInvQtd} style={{ textAlign: 'center' }} onChange={v => setNewInvQtd(v)} />
                  </div>
                </div>
                <div className="fg" style={{ marginBottom: 8 }}><label>Descrição</label>
                  <textarea value={newInvDesc} placeholder="Notas, efeitos, detalhes…" rows={2} style={{ resize: 'none' }} onChange={e => setNewInvDesc(e.target.value)} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary btn-sm" onClick={addInv}>+ Adicionar Item</button>
                </div>
              </div>
            </div>
          </div>

          {/* Habilidades de Classe */}
          <div className="ss">
            <div className="ss-hdr">Habilidades de Classe — {cls.nome}</div>
            <div className="ss-body">
              {cls.habs.map(h => (
                <div key={h.n} className="ca">
                  <div className="ca-name">{h.n}</div>
                  <div className="ca-desc">{h.d}</div>
                </div>
              ))}
              {c.notas && (
                <>
                  <div className="divider" />
                  <div style={{ fontSize: '.8rem', color: 'var(--text-dim)', whiteSpace: 'pre-wrap' }}>{c.notas}</div>
                </>
              )}
            </div>
          </div>

          {/* Multiclasse */}
          {multiData && (
            <div className="ss">
              <div className="ss-hdr">Multiclasse — {multiData.nome}{c.multiDom ? ` · ${c.multiDom}` : ''}</div>
              <div className="ss-body">
                {multiData.habs.map(h => (
                  <div key={h.n} className="ca">
                    <div className="ca-name">{h.n}</div>
                    <div className="ca-desc">{h.d}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cartas de Domínio */}
          {(allSelectedCards.length > 0 || multiSubclasseCard) && (
            <div className="ss">
              <div className="ss-hdr">Cartas de Domínio</div>
              <div className="ss-body">
                {/* Carta fundamental de multiclasse — sempre ativa, não conta para a mão */}
                {multiSubclasseCard && (
                  <div style={{ marginBottom: allSelectedCards.length > 0 ? 12 : 0 }}>
                    <div className="card-state-lbl">Multiclasse — {c.multiSubclasse}</div>
                    <div className="ca">
                      <div className="ca-name">
                        {multiSubclasseCard.nome}
                        <span className="ca-name-meta"> · Fundamental · {multiData?.nome}</span>
                      </div>
                      <div className="ca-desc">{multiSubclasseCard.descricao}</div>
                    </div>
                  </div>
                )}

                {/* Na mão */}
                {naMAo.length > 0 && (
                  <div style={{ marginTop: multiSubclasseCard ? 12 : 0 }}>
                    <div className="card-state-lbl">Na mão ({naMAo.length})</div>
                    {naMAo.map(card => (
                      <div key={card.num} className="ca">
                        <div className="ca-name" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span>{card.nome}</span>
                          <span className="ca-name-meta">Nv.{card.nivel_dominio}{(card.custo ?? 0) > 0 ? ` · ${card.custo}⚡ PF` : ''} · {card.card_tipo}</span>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 8px', fontSize: '.72rem' }}
                            onClick={() => toggleCartaAtiva(card.num)}
                          >→ Reserva</button>
                        </div>
                        <div className="ca-desc">{card.descricao}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reserva */}
                {reserva.length > 0 && (
                  <div style={{ marginTop: (naMAo.length > 0 || multiSubclasseCard) ? 12 : 0 }}>
                    <div className="card-state-lbl">Reserva ({reserva.length})</div>
                    {reserva.map(card => (
                      <div key={card.num} className="ca" style={{ opacity: .65 }}>
                        <div className="ca-name" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <button className="card-expand-btn" style={{ fontSize: '.8rem', opacity: 1 }} onClick={() => toggleExpand(card.num)}>
                            {expandedCards.has(card.num) ? '▲' : '▼'}
                          </button>
                          <span>{card.nome}</span>
                          <span className="ca-name-meta">Nv.{card.nivel_dominio}{(card.custo ?? 0) > 0 ? ` · ${card.custo}⚡ PF` : ''}</span>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '2px 8px', fontSize: '.72rem', opacity: 1 }}
                            onClick={() => toggleCartaAtiva(card.num)}
                          >→ Na mão</button>
                        </div>
                        {expandedCards.has(card.num) && (
                          <div className="ca-desc" style={{ opacity: 1 }}>{card.descricao}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function TrackBoxes({ label, type, max, current, onToggle, testIdPrefix }: {
  label: string; type: 'hp' | 'fp' | 'ar';
  max: number; current: number; onToggle: (i: number) => void;
  testIdPrefix?: string;
}) {
  const marked = max - current;
  return (
    <>
      <div className="track-lbl">
        <span>{label}</span>
        <span {...(testIdPrefix ? { 'data-testid': `${testIdPrefix}-count` } : {})}>{current}/{max}</span>
      </div>
      <div className="boxes">
        {Array.from({ length: max }, (_, i) => (
          <div key={i} className={`box ${type}${i < marked ? ' on' : ''}`}
               onClick={() => onToggle(i)}
               {...(testIdPrefix ? { 'data-testid': `${testIdPrefix}-box` } : {})} />
        ))}
      </div>
    </>
  );
}

function TempRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="temp-row">
      <span>{label}</span>
      <NumInput
        className="temp-in" inputMode="numeric" min={0} step={1} value={value}
        onChange={onChange}
      />
    </div>
  );
}

function WeaponDisplay({ type, nome, attr, dados, hab, maos, prof }: {
  type: string; nome: string; attr: string; dados: string; hab: string;
  maos: string; prof: number;
}) {
  if (!nome) return null;
  const maosLabel = maos === 'duas' ? 'Duas mãos' : 'Uma mão';
  return (
    <div className="wd">
      <div className="wd-type">{type}</div>
      <div className="wd-name">{nome}</div>
      <div className="wd-meta">
        {attr}{dados ? ` | ${dados}` : ''} | {maosLabel}{prof ? ` | Prof +${prof}` : ''}
      </div>
      {hab && <div className="wd-skill">{hab}</div>}
    </div>
  );
}
