import { useState, useEffect, ReactNode } from 'react';
import { useCharStore } from '../store/useCharStore';
import { Character, ExpEntry, InvEntry, EvoState, uid, makeDefaultCharacter } from '../types/character';
import { CLS } from '../constants/cls';
import { MULTI } from '../constants/multi';
import { EVO_TIERS, TIER_RANGES } from '../constants/evo';
import CollapsibleSection from '../components/CollapsibleSection';
import NumInput from '../components/NumInput';
import { api } from '../api';
import { Card, DOMAIN_NAME_TO_KEY } from '../types/cards';
import { Campaign } from '../types/campaign';

interface Props {
  editId: string | null;
  onDone: () => void;
  campaignId?: string;
}

type FormState = Omit<Character, 'id'>;

function buildForm(c?: Character): FormState {
  const defaults = makeDefaultCharacter() as FormState;
  if (c) {
    const { id: _id, ...rest } = c;
    return { ...defaults, ...rest };
  }
  return defaults;
}

export default function FormScreen({ editId, onDone, campaignId }: Props) {
  const chars = useCharStore(s => s.chars);
  const saveChar = useCharStore(s => s.saveChar);
  const showNotif = useCharStore(s => s.showNotif);

  const existing = editId ? chars.find(c => c.id === editId) : undefined;

  const [form, setForm] = useState<FormState>(() => buildForm(existing));
  const [exps, setExps] = useState<ExpEntry[]>(() =>
    existing?.exps?.length ? existing.exps : Array(5).fill(null).map(() => ({ nome: '', val: 0 }))
  );
  const [inv, setInv] = useState<InvEntry[]>(() => existing?.inv || []);
  const [evo, setEvo] = useState<{ p2: EvoState; p3: EvoState; p4: EvoState }>(() =>
    existing?.evo || { p2: {}, p3: {}, p4: {} }
  );
  const [subclasseOpts, setSubclasseOpts] = useState<string[]>([]);
  const [allSubclasseCards, setAllSubclasseCards] = useState<Card[]>([]);
  const [dominioCards, setDominioCards] = useState<Card[]>([]);
  const [ancestralidadeOpts, setAncestralidades] = useState<Card[]>([]);
  const [comunidadeOpts, setComunidades] = useState<Card[]>([]);
  const [multiSubclasseOpts, setMultiSubclasseOpts] = useState<string[]>([]);
  const [allMultiSubclasseCards, setAllMultiSubclasseCards] = useState<Card[]>([]);
  const [multiDomainCards, setMultiDomainCards] = useState<Card[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const toggleExpand = (num: number) =>
    setExpandedCards(s => { const n = new Set(s); n.has(num) ? n.delete(num) : n.add(num); return n; });

  const [myCampaigns, setMyCampaigns] = useState<Campaign[]>([]);
  useEffect(() => {
    api.campaigns.list().then(setMyCampaigns).catch(() => setMyCampaigns([]));
  }, []);

  useEffect(() => {
    api.cards.getAll({ tipo: 'ancestralidade' })
      .then(c => setAncestralidades(c.sort((a, b) => a.nome.localeCompare(b.nome))));
    api.cards.getAll({ tipo: 'comunidade' })
      .then(c => setComunidades(c.sort((a, b) => a.nome.localeCompare(b.nome))));
  }, []);

  useEffect(() => {
    if (!form.cls) {
      setSubclasseOpts([]); setAllSubclasseCards([]); setDominioCards([]); return;
    }
    api.cards.getAll({ tipo: 'subclasse', classe: form.cls }).then(cards => {
      setAllSubclasseCards(cards);
      const unique = [...new Set(cards.map(c => c.subclasse_nome).filter(Boolean))] as string[];
      setSubclasseOpts(unique);
    }).catch(() => { setSubclasseOpts([]); setAllSubclasseCards([]); });
    const domNames = MULTI[form.cls]?.doms ?? [];
    const domKeys = domNames.map(d => DOMAIN_NAME_TO_KEY[d]).filter(Boolean);
    Promise.all(domKeys.map(k => api.cards.getAll({ tipo: 'dominio', dominio_key: k })))
      .then(results => setDominioCards(
        results.flat().sort((a, b) => (a.nivel_dominio ?? 0) - (b.nivel_dominio ?? 0))
      ))
      .catch(() => setDominioCards([]));
  }, [form.cls]);

  useEffect(() => {
    if (!form.multiEnabled || !form.multiCls) {
      setMultiSubclasseOpts([]); setAllMultiSubclasseCards([]); return;
    }
    api.cards.getAll({ tipo: 'subclasse', classe: form.multiCls })
      .then(cards => {
        setAllMultiSubclasseCards(cards);
        const unique = [...new Set(cards.map(c => c.subclasse_nome).filter(Boolean))] as string[];
        setMultiSubclasseOpts(unique);
      }).catch(() => { setMultiSubclasseOpts([]); setAllMultiSubclasseCards([]); });
  }, [form.multiEnabled, form.multiCls]);

  useEffect(() => {
    if (!form.multiEnabled || !form.multiDom) { setMultiDomainCards([]); return; }
    const domKey = DOMAIN_NAME_TO_KEY[form.multiDom];
    if (!domKey) { setMultiDomainCards([]); return; }
    api.cards.getAll({ tipo: 'dominio', dominio_key: domKey })
      .then(cards => setMultiDomainCards(
        cards.sort((a, b) => (a.nivel_dominio ?? 0) - (b.nivel_dominio ?? 0))
      ))
      .catch(() => setMultiDomainCards([]));
  }, [form.multiEnabled, form.multiDom]);

  useEffect(() => {
    const c = editId ? chars.find(x => x.id === editId) : undefined;
    if (c) {
      setForm(buildForm(c));
      setExps(c.exps?.length ? c.exps : Array(5).fill(null).map(() => ({ nome: '', val: 0 })));
      setInv(c.inv || []);
      setEvo(c.evo || { p2: {}, p3: {}, p4: {} });
    }
  }, [editId]);

  // Pré-vincular à campanha quando criando um novo personagem
  useEffect(() => {
    if (campaignId && !editId) {
      set('campaign_id', campaignId);
    }
  }, [campaignId, editId]);

  const set = (field: keyof FormState, value: unknown) =>
    setForm(f => ({ ...f, [field]: value }));

  const [swapOpen, setSwapOpen] = useState<null | 'principal' | 'secundaria'>(null);

  function doSwap(activeSlot: 'principal' | 'secundaria', invSlot: 1 | 2) {
    const aP = activeSlot === 'principal' ? 'wp' : 'ws';
    const iP = `wi${invSlot}` as 'wi1' | 'wi2';
    type F = FormState;
    setForm(prev => ({
      ...prev,
      [`${aP}Nome`]: prev[`${iP}Nome` as keyof F],
      [`${aP}Attr`]: prev[`${iP}Attr` as keyof F],
      [`${aP}Dados`]: prev[`${iP}Dados` as keyof F],
      [`${aP}Hab`]: prev[`${iP}Hab` as keyof F],
      [`${aP}Maos`]: prev[`${iP}Maos` as keyof F],
      [`${iP}Nome`]: prev[`${aP}Nome` as keyof F],
      [`${iP}Attr`]: prev[`${aP}Attr` as keyof F],
      [`${iP}Dados`]: prev[`${aP}Dados` as keyof F],
      [`${iP}Hab`]: prev[`${aP}Hab` as keyof F],
      [`${iP}Maos`]: prev[`${aP}Maos` as keyof F],
      [`${iP}Tipo`]: activeSlot,
    }));
    setSwapOpen(null);
  }

  const handleSave = async () => {
    if (!form.cls) { showNotif('Selecione uma classe!'); return; }
    const nome = form.nome.trim();
    if (!nome) { showNotif('Informe o nome do personagem!'); return; }

    const filteredExps = exps.filter(e => e.nome.trim());
    const filteredInv = inv.filter(i => i.nome.trim());

    const sessionState = existing
      ? { pvAtual: existing.pvAtual, pfAtual: existing.pfAtual, esperanca: existing.esperanca, paAtual: existing.paAtual }
      : { pvAtual: form.pvMax, pfAtual: form.pfMax, esperanca: 6, paAtual: form.armBase };

    const char: Character = {
      ...form,
      id: editId || uid(),
      nome,
      exps: filteredExps,
      inv: filteredInv,
      evo,
      ...sessionState,
    };

    await saveChar(char);
    onDone();
  };

  const addExp = () => setExps(e => [...e, { nome: '', val: 0 }]);
  const removeExp = (i: number) => setExps(e => e.filter((_, idx) => idx !== i));
  const updateExp = (i: number, field: keyof ExpEntry, value: string | number) =>
    setExps(e => e.map((x, idx) => idx === i ? { ...x, [field]: value } : x));

  const addInv = () => setInv(i => [...i, { nome: '', qtd: 1, desc: '' }]);
  const removeInv = (i: number) => setInv(items => items.filter((_, idx) => idx !== i));
  const updateInv = (i: number, field: keyof InvEntry, value: string | number) =>
    setInv(items => items.map((x, idx) => idx === i ? { ...x, [field]: value } : x));

  const setEvoCheck = (tier: 'p2' | 'p3' | 'p4', key: string, val: boolean) =>
    setEvo(e => ({ ...e, [tier]: { ...e[tier], [key]: val } }));

  const nivel = form.nivel || 1;
  const clsData = form.cls ? CLS[form.cls] : null;
  const primaryDoms = form.cls && MULTI[form.cls] ? MULTI[form.cls].doms : [];
  const subcCards = allSubclasseCards.filter(c => c.subclasse_nome === form.subclasse);
  const cartasDominio = form.cartasDominio ?? [];
  const selectedAncCard = ancestralidadeOpts.find(a => a.nome === form.heranca);
  const selectedComCard = comunidadeOpts.find(c => c.nome === (form.comunidade ?? ''));
  const multiFundCard = form.multiEnabled && form.multiSubclasse
    ? allMultiSubclasseCards.find(c => c.subclasse_nome === form.multiSubclasse && c.nivel_subclasse === 'Fundamental')
    : null;

  return (
    <div className="form-wrap">
      {/* CLASSE */}
      <CollapsibleSection title="Classe">
        <div className="cls-grid">
          {Object.entries(CLS).map(([k, v]) => (
            <div
              key={k}
              className={`cls-opt${form.cls === k ? ' sel' : ''}`}
              onClick={() => {
                set('cls', k as Character['cls']);
                set('evBonus', 0);
                set('subclasse', '');
              }}
            >
              <div className="cls-opt-name">{v.nome}</div>
              <div className="cls-opt-sub">{v.sub}</div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* CAMPANHA */}
      {(myCampaigns.length > 0 || form.campaign_id) && (
        <CollapsibleSection title="Campanha">
          <div className="frow c2">
            <div className="fg">
              <label>Vincular à Campanha</label>
              {campaignId ? (
                <input
                  type="text"
                  readOnly
                  value={myCampaigns.find(c => c.id === campaignId)?.nome ?? campaignId}
                  style={{ color: 'var(--accent)', cursor: 'default' }}
                />
              ) : (
                <select
                  value={form.campaign_id || ''}
                  onChange={e => set('campaign_id', e.target.value || undefined)}
                >
                  <option value="">Nenhuma</option>
                  {myCampaigns.filter(c => c.meu_status === 'aprovado').map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                  {form.campaign_id && !myCampaigns.find(c => c.id === form.campaign_id) && (
                    <option value={form.campaign_id}>Campanha vinculada</option>
                  )}
                </select>
              )}
            </div>
            {(form.campaign_id || campaignId) && (
              <div className="fg">
                <label>Personagem Privado</label>
                <div
                  className={`chk-toggle${form.privado ? ' active' : ''}`}
                  onClick={() => set('privado', !form.privado)}
                >
                  {form.privado ? 'Sim (só o Mestre vê)' : '—'}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* IDENTIDADE */}
      <CollapsibleSection title="Identidade">
        <div className="frow c2">
          <div className="fg"><label>Nome</label>
            <input type="text" value={form.nome} placeholder="Nome do personagem" onChange={e => set('nome', e.target.value)} />
          </div>
          <div className="fg"><label>Gênero</label>
            <input type="text" value={form.genero} placeholder="Ex: Masculino…" onChange={e => set('genero', e.target.value)} />
          </div>
        </div>
        <div className="frow c2">
          <div className="fg">
            <label>Ancestralidade</label>
            <select value={form.heranca} onChange={e => set('heranca', e.target.value)}>
              <option value="">— Escolha a ancestralidade —</option>
              {ancestralidadeOpts.map(a => <option key={a.num} value={a.nome}>{a.nome}</option>)}
            </select>
            {selectedAncCard && <div className="card-inline-preview">{selectedAncCard.descricao}</div>}
          </div>
          <div className="fg">
            <label>Comunidade</label>
            <select value={form.comunidade ?? ''} onChange={e => set('comunidade', e.target.value)}>
              <option value="">— Escolha a comunidade —</option>
              {comunidadeOpts.map(c => <option key={c.num} value={c.nome}>{c.nome}</option>)}
            </select>
            {selectedComCard && <div className="card-inline-preview">{selectedComCard.descricao}</div>}
          </div>
        </div>
        <div className="frow c3">
          <div className="fg"><label>Subclasse</label>
            {subclasseOpts.length > 0 ? (
              <select value={form.subclasse} onChange={e => set('subclasse', e.target.value)}>
                <option value="">— Escolha a subclasse —</option>
                {subclasseOpts.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input type="text" value={form.subclasse} placeholder={form.cls ? 'Carregando…' : 'Selecione uma classe primeiro'} disabled={!form.cls} onChange={e => set('subclasse', e.target.value)} />
            )}
          </div>
          <div className="fg"><label>Nível</label>
            <NumInput inputMode="numeric" min={1} max={10} step={1} fallback={1} value={form.nivel}
              onChange={v => set('nivel', v)} />
          </div>
          <div className="fg"><label>Proficiência</label>
            <NumInput inputMode="numeric" min={1} max={6} step={1} fallback={1} value={form.prof}
              onChange={v => set('prof', v)} />
          </div>
        </div>
      </CollapsibleSection>

      {/* ATRIBUTOS */}
      <CollapsibleSection title="Atributos">
        <div className="frow c6">
          {(['agi', 'for', 'acu', 'ins', 'pre', 'con'] as const).map(a => {
            const labels: Record<string, string> = { agi: 'Agilidade', for: 'Força', acu: 'Acuidade', ins: 'Instinto', pre: 'Presença', con: 'Conhecimento' };
            const upKey = `${a}Up` as keyof FormState;
            const checked = !!form[upKey];
            return (
              <div key={a} className="fg">
                <label>{labels[a]}</label>
                <NumInput className="attr-in" step={1} value={form[a]}
                  onChange={v => set(a, v)} />
                <label style={{ marginTop: 6 }}>↑ Evoluído</label>
                <div className={`chk-toggle${checked ? ' active' : ''}`} onClick={() => set(upKey, !checked)}>
                  {checked ? 'Sim' : '—'}
                </div>
              </div>
            );
          })}
        </div>
        <div className="frow c4">
          <div className="fg">
            <label>Evasão base da classe</label>
            <input type="text" value={clsData ? clsData.ev : '—'} readOnly
              style={{ color: 'var(--accent)', fontWeight: 700, textAlign: 'center', cursor: 'default' }} />
          </div>
          <div className="fg"><label>Evasão (bônus)</label>
            <NumInput inputMode="numeric" min={0} step={1} value={form.evBonus} onChange={v => set('evBonus', v)} />
          </div>
          <div className="fg"><label>PV Máximo</label>
            <NumInput inputMode="numeric" min={1} step={1} fallback={1} value={form.pvMax} onChange={v => set('pvMax', v)} />
          </div>
          <div className="fg"><label>PF Máximo (Fadiga)</label>
            <NumInput inputMode="numeric" min={1} step={1} fallback={1} value={form.pfMax} onChange={v => set('pfMax', v)} />
          </div>
        </div>
      </CollapsibleSection>

      {/* SAÚDE & LIMIARES */}
      <CollapsibleSection title="Saúde & Limiares de Dano">
        <p style={{ fontSize: '.75rem', color: 'var(--text-dim)', marginBottom: 10 }}>
          Some seu nível atual aos limiares base para obter os valores finais.
        </p>
        <div className="frow c2">
          <div className="fg"><label>Limiar Menor</label>
            <NumInput inputMode="numeric" min={0} step={1} value={form.dm} placeholder="Ex: 5" onChange={v => set('dm', v)} />
          </div>
          <div className="fg"><label>Limiar Grave</label>
            <NumInput inputMode="numeric" min={0} step={1} value={form.dG} placeholder="Ex: 11" onChange={v => set('dG', v)} />
          </div>
        </div>
      </CollapsibleSection>

      {/* ARMAS ATIVAS */}
      <CollapsibleSection title="Armas Ativas">
        <div className="frow c2">
          {(['principal', 'secundaria'] as const).map(slot => {
            const isOpen = swapOpen === slot;
            const invOptions = ([1, 2] as const)
              .map(n => ({ n, nome: form[`wi${n}Nome` as keyof FormState] as string }))
              .filter(o => o.nome);
            return (
              <div key={slot}>
                {slot === 'principal'
                  ? <WeaponBlock title="Principal" nome={form.wpNome} attr={form.wpAttr} dados={form.wpDados} hab={form.wpHab} maos={form.wpMaos} onNome={v => set('wpNome', v)} onAttr={v => set('wpAttr', v)} onDados={v => set('wpDados', v)} onHab={v => set('wpHab', v)} onMaos={v => set('wpMaos', v as 'uma' | 'duas')} />
                  : <WeaponBlock title="Secundária" nome={form.wsNome} attr={form.wsAttr} dados={form.wsDados} hab={form.wsHab} maos={form.wsMaos} onNome={v => set('wsNome', v)} onAttr={v => set('wsAttr', v)} onDados={v => set('wsDados', v)} onHab={v => set('wsHab', v)} onMaos={v => set('wsMaos', v as 'uma' | 'duas')} />
                }
                {invOptions.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ width: '100%' }}
                      onClick={() => setSwapOpen(isOpen ? null : slot)}
                    >
                      {isOpen ? '✕ Cancelar troca' : '⇄ Trocar com inventário'}
                    </button>
                    {isOpen && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        {invOptions.map(({ n, nome }) => (
                          <button
                            key={n}
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => doSwap(slot, n)}
                          >
                            ⇄ {nome}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* ARMADURA */}
      <CollapsibleSection title="Armadura Ativa">
        <div className="frow c3">
          <div className="fg"><label>Nome</label>
            <input type="text" value={form.armNome} placeholder="Ex: Gibão" onChange={e => set('armNome', e.target.value)} />
          </div>
          <div className="fg"><label>Limiares Base</label>
            <input type="text" value={form.armLim} placeholder="Ex: 5/11" onChange={e => set('armLim', e.target.value)} />
          </div>
          <div className="fg"><label>Armadura Base (PA máx)</label>
            <NumInput inputMode="numeric" min={0} step={1} value={form.armBase} onChange={v => set('armBase', v)} />
          </div>
        </div>
        <div className="frow">
          <div className="fg"><label>Habilidade</label>
            <textarea value={form.armHab} rows={2} placeholder="Ex: Flexível: +1 em Evasão" onChange={e => set('armHab', e.target.value)} />
          </div>
        </div>
      </CollapsibleSection>

      {/* EXPERIÊNCIAS */}
      <CollapsibleSection title="Experiências" headerRight={
        <button className="btn btn-ghost btn-sm" onClick={addExp}>+ Experiência</button>
      }>
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <span style={{ minWidth: 24 }} />
          <span style={{ flex: 1, fontSize: '.62rem', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Experiência</span>
          <span style={{ width: 70, fontSize: '.62rem', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-dim)', textAlign: 'center' }}>Mod.</span>
          <span style={{ width: 28 }} />
        </div>
        {exps.map((exp, i) => (
          <div key={i} className="exp-row">
            <span className="exp-row-lbl">
              {i + 1}{i >= 5 && <span style={{ color: 'var(--hope)' }}>★</span>}
            </span>
            <input
              type="text" value={exp.nome} placeholder="Nome da experiência…"
              onChange={e => updateExp(i, 'nome', e.target.value)}
              style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', padding: '7px 9px', fontSize: '.88rem' }}
            />
            <NumInput
              step={1} value={exp.val}
              onChange={v => updateExp(i, 'val', v)}
              style={{ width: 70, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', padding: '7px 9px', fontSize: '.88rem', textAlign: 'center' }}
            />
            {i >= 5 ? (
              <button onClick={() => removeExp(i)} style={{ background: 'var(--surface3)', border: '1px solid var(--border)', color: 'var(--text-dim)', borderRadius: 4, cursor: 'pointer', width: 28, height: 34, fontSize: '.85rem' }}>✕</button>
            ) : <div style={{ width: 28, flexShrink: 0 }} />}
          </div>
        ))}
      </CollapsibleSection>

      {/* OURO */}
      <CollapsibleSection title="Ouro">
        <div className="frow c3">
          <div className="fg"><label>Punhados</label><NumInput inputMode="numeric" min={0} step={1} value={form.gP} onChange={v => set('gP', v)} /></div>
          <div className="fg"><label>Bolsas</label><NumInput inputMode="numeric" min={0} step={1} value={form.gB} onChange={v => set('gB', v)} /></div>
          <div className="fg"><label>Baú</label><NumInput inputMode="numeric" min={0} step={1} value={form.gBau} onChange={v => set('gBau', v)} /></div>
        </div>
      </CollapsibleSection>

      {/* INVENTÁRIO */}
      <CollapsibleSection title="Inventário" headerRight={
        <button className="btn btn-ghost btn-sm" onClick={addInv}>+ Item</button>
      }>
        {inv.length === 0
          ? <p style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>Nenhum item. Clique em "+ Item" para adicionar.</p>
          : inv.map((item, i) => (
            <div key={i} className="inv-card">
              <div className="inv-card-row">
                <div className="fg"><label>Nome</label>
                  <input type="text" value={item.nome} placeholder="Nome do item…" onChange={e => updateInv(i, 'nome', e.target.value)} />
                </div>
                <div className="fg"><label>Quantidade</label>
                  <NumInput inputMode="numeric" min={1} step={1} fallback={1} value={item.qtd} onChange={v => updateInv(i, 'qtd', v)} style={{ textAlign: 'center' }} />
                </div>
                <button className="del-btn" onClick={() => removeInv(i)}>✕</button>
              </div>
              <div className="fg"><label>Descrição</label>
                <input type="text" value={item.desc} placeholder="Notas, efeitos, detalhes…" onChange={e => updateInv(i, 'desc', e.target.value)} />
              </div>
            </div>
          ))
        }
      </CollapsibleSection>

      {/* ARMAS NO INVENTÁRIO */}
      <CollapsibleSection title="Armas no Inventário">
        <div className="frow c2">
          <InvWeaponBlock
            title="Arma no Inventário 1"
            nome={form.wi1Nome} attr={form.wi1Attr} dados={form.wi1Dados} hab={form.wi1Hab}
            maos={form.wi1Maos} tipo={form.wi1Tipo}
            onNome={v => set('wi1Nome', v)} onAttr={v => set('wi1Attr', v)} onDados={v => set('wi1Dados', v)}
            onHab={v => set('wi1Hab', v)} onMaos={v => set('wi1Maos', v as 'uma' | 'duas')}
            onTipo={v => set('wi1Tipo', v as '' | 'primaria' | 'secundaria')}
          />
          <InvWeaponBlock
            title="Arma no Inventário 2"
            nome={form.wi2Nome} attr={form.wi2Attr} dados={form.wi2Dados} hab={form.wi2Hab}
            maos={form.wi2Maos} tipo={form.wi2Tipo}
            onNome={v => set('wi2Nome', v)} onAttr={v => set('wi2Attr', v)} onDados={v => set('wi2Dados', v)}
            onHab={v => set('wi2Hab', v)} onMaos={v => set('wi2Maos', v as 'uma' | 'duas')}
            onTipo={v => set('wi2Tipo', v as '' | 'primaria' | 'secundaria')}
          />
        </div>
      </CollapsibleSection>

      {/* NOTAS */}
      <CollapsibleSection title="Habilidades de Classe Adicionais / Notas">
        <div className="fg"><label>Notas / Habilidades extras</label>
          <textarea value={form.notas} rows={4} placeholder="Cartas de domínio, notas de subclasse, etc." onChange={e => set('notas', e.target.value)} />
        </div>
      </CollapsibleSection>

      {/* CARTAS DO PERSONAGEM */}
      {form.cls && (
        <CollapsibleSection title="Cartas do Personagem">
          {!form.subclasse && dominioCards.length === 0 && !multiFundCard && !multiDomainCards.length && (
            <p style={{ color: 'var(--text-dim)', fontSize: '.82rem' }}>
              Selecione uma subclasse para ver as cartas disponíveis.
            </p>
          )}

          {/* Grupo: Subclasse */}
          {form.subclasse && subcCards.length > 0 && (
            <CardGroup title={
              <span>
                Subclasse — <strong>{form.subclasse}</strong>
                {subcCards[0]?.atributo_conjuracao && (
                  <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: '.75rem' }}>
                    {' · '}{subcCards[0].atributo_conjuracao}
                  </span>
                )}
              </span>
            }>
              {subcCards.map(card => {
                const subCount = (evo.p3?.sub ? 1 : 0) + (evo.p4?.sub ? 1 : 0);
                const isLocked =
                  (card.nivel_subclasse === 'Especialização' && subCount < 1) ||
                  (card.nivel_subclasse === 'Maestria' && (subCount < 2 || form.multiEnabled));
                const lockMsg = card.nivel_subclasse === 'Maestria' && form.multiEnabled
                  ? 'Indisponível com Multiclasse habilitada.'
                  : card.nivel_subclasse === 'Maestria'
                  ? `Marque "Melhorar carta de subclasse" 2 vezes em qualquer Patamar para desbloquear (${subCount}/2).`
                  : 'Marque "Melhorar carta de subclasse" em qualquer Patamar para desbloquear.';
                return (
                  <div key={card.num} className={`subclass-card-view${isLocked ? ' locked' : ''}`}>
                    <div className="subclass-card-nivel" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isLocked && (
                        <button className="card-expand-btn" onClick={e => { e.stopPropagation(); toggleExpand(card.num); }}>
                          {expandedCards.has(card.num) ? '▲' : '▼'}
                        </button>
                      )}
                      {card.nivel_subclasse}
                      {isLocked && <span className="subclass-card-lock">🔒</span>}
                    </div>
                    {isLocked ? (
                      <>
                        <div className="subclass-card-lock-msg">{lockMsg}</div>
                        {expandedCards.has(card.num) && (
                          <div className="subclass-card-desc" style={{ opacity: .6, marginTop: 6 }}>{card.descricao}</div>
                        )}
                      </>
                    ) : (
                      <div className="subclass-card-desc">{card.descricao}</div>
                    )}
                  </div>
                );
              })}
            </CardGroup>
          )}

          {/* Grupos: um por domínio da classe primária */}
          {(MULTI[form.cls]?.doms ?? []).map(domName => {
            const domKey = DOMAIN_NAME_TO_KEY[domName];
            const cards = dominioCards.filter(c => c.dominio_key === domKey);
            if (!cards.length) return null;
            const selCount = cards.filter(c => cartasDominio.includes(c.num)).length;
            return (
              <CardGroup
                key={domName}
                searchable
                title={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`dom-card-group-hdr pill pill-dom-${domKey}`} style={{ margin: 0 }}>{domName}</span>
                    {selCount > 0 && (
                      <span style={{ fontSize: '.72rem', color: 'var(--text-dim)', fontWeight: 400 }}>
                        {selCount} selecionada{selCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                }
              >
                {query => (
                  <div className="card-pick-list">
                    {cards
                      .filter(c => { const q = query.toLowerCase(); return c.nome.toLowerCase().includes(q) || (c.descricao ?? '').toLowerCase().includes(q); })
                      .map(card => {
                        const sel = cartasDominio.includes(card.num);
                        const locked = (card.nivel_dominio ?? 0) > nivel;
                        const expanded = expandedCards.has(card.num);
                        return (
                          <div
                            key={card.num}
                            className={`card-pick-row${sel ? ' sel' : ''}${locked ? ' locked' : ''}`}
                            onClick={() => {
                              if (locked) return;
                              set('cartasDominio', sel ? cartasDominio.filter(n => n !== card.num) : [...cartasDominio, card.num]);
                            }}
                          >
                            <div className="card-pick-row-top">
                              <span className="card-pick-chk">{locked ? '🔒' : sel ? '✓' : '○'}</span>
                              <button className="card-expand-btn" onClick={e => { e.stopPropagation(); toggleExpand(card.num); }}>
                                {expanded ? '▲' : '▼'}
                              </button>
                              <span className="card-pick-name">{card.nome}</span>
                              <span className="card-pick-badges">
                                <span className={`cbadge${locked ? ' cbadge-locked' : ''}`}>Nv.{card.nivel_dominio}</span>
                                {(card.custo ?? 0) > 0 && <span className="cbadge">{card.custo}⚡</span>}
                                <span className="cbadge cbadge-tipo">{card.card_tipo}</span>
                              </span>
                            </div>
                            {(expanded || (sel && !locked)) && <div className="card-pick-desc">{card.descricao}</div>}
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardGroup>
            );
          })}

          {/* Grupo: Carta fundamental de multiclasse (automática) */}
          {multiFundCard && (
            <CardGroup title={
              <span>
                <strong>{form.multiSubclasse}</strong>
                <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: '.75rem' }}>
                  {' · '}Fundamental · {MULTI[form.multiCls!]?.nome}
                </span>
                <span style={{ fontSize: '.68rem', color: 'var(--accent)', fontWeight: 400, marginLeft: 6 }}>
                  automática
                </span>
              </span>
            }>
              <div className="subclass-card-desc" style={{ lineHeight: 1.7 }}>{multiFundCard.descricao}</div>
            </CardGroup>
          )}

          {/* Grupo: Domínio de multiclasse */}
          {form.multiEnabled && form.multiDom && multiDomainCards.length > 0 && (() => {
            const domKey = DOMAIN_NAME_TO_KEY[form.multiDom];
            const selCount = multiDomainCards.filter(c => cartasDominio.includes(c.num)).length;
            return (
              <CardGroup
                searchable
                title={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`dom-card-group-hdr pill pill-dom-${domKey}`} style={{ margin: 0 }}>{form.multiDom}</span>
                    <span style={{ fontSize: '.72rem', color: 'var(--text-dim)', fontWeight: 400 }}>Multiclasse</span>
                    {selCount > 0 && (
                      <span style={{ fontSize: '.72rem', color: 'var(--text-dim)', fontWeight: 400 }}>
                        · {selCount} selecionada{selCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                }
              >
                {query => (
                  <div className="card-pick-list">
                    {multiDomainCards
                      .filter(c => { const q = query.toLowerCase(); return c.nome.toLowerCase().includes(q) || (c.descricao ?? '').toLowerCase().includes(q); })
                      .map(card => {
                        const sel = cartasDominio.includes(card.num);
                        const locked = (card.nivel_dominio ?? 0) > nivel;
                        const expanded = expandedCards.has(card.num);
                        return (
                          <div
                            key={card.num}
                            className={`card-pick-row${sel ? ' sel' : ''}${locked ? ' locked' : ''}`}
                            onClick={() => {
                              if (locked) return;
                              set('cartasDominio', sel ? cartasDominio.filter(n => n !== card.num) : [...cartasDominio, card.num]);
                            }}
                          >
                            <div className="card-pick-row-top">
                              <span className="card-pick-chk">{locked ? '🔒' : sel ? '✓' : '○'}</span>
                              <button className="card-expand-btn" onClick={e => { e.stopPropagation(); toggleExpand(card.num); }}>
                                {expanded ? '▲' : '▼'}
                              </button>
                              <span className="card-pick-name">{card.nome}</span>
                              <span className="card-pick-badges">
                                <span className={`cbadge${locked ? ' cbadge-locked' : ''}`}>Nv.{card.nivel_dominio}</span>
                                {(card.custo ?? 0) > 0 && <span className="cbadge">{card.custo}⚡</span>}
                                <span className="cbadge cbadge-tipo">{card.card_tipo}</span>
                              </span>
                            </div>
                            {(expanded || (sel && !locked)) && <div className="card-pick-desc">{card.descricao}</div>}
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardGroup>
            );
          })()}
        </CollapsibleSection>
      )}

      {/* MULTICLASSE */}
      <CollapsibleSection title="Multiclasse">
        <label className="multi-toggle">
          <input type="checkbox" checked={form.multiEnabled}
            onChange={e => {
              set('multiEnabled', e.target.checked);
              if (!e.target.checked) { set('multiCls', null); set('multiDom', null); set('multiSubclasse', ''); }
            }} />
          <span style={{ fontSize: '.82rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
            Habilitar multiclasse para este personagem
          </span>
        </label>

        {form.multiEnabled && (
          <div>
            <p style={{ fontSize: '.75rem', color: 'var(--text-dim)', marginBottom: 10 }}>
              Ao optar por multiclasse, coloque uma das cartas fundamentais da nova classe na sua mão. Em seguida, escolha um domínio para expandir.
            </p>
            <div style={{ fontSize: '.6rem', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
              Escolha a classe adicional
            </div>
            <div className="multi-cls-grid">
              {Object.entries(MULTI).map(([k, m]) => (
                <div
                  key={k}
                  className={`multi-cls-opt${form.multiCls === k ? ' sel' : ''}${k === form.cls ? ' disabled' : ''}`}
                  onClick={() => { if (k !== form.cls) { set('multiCls', k); set('multiDom', null); set('multiSubclasse', ''); } }}
                >
                  {m.nome}
                </div>
              ))}
            </div>

            {form.multiCls && MULTI[form.multiCls] && (
              <>
                <div style={{ fontSize: '.6rem', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8, marginTop: 14 }}>
                  Escolha a subclasse
                </div>
                <div className="fg" style={{ marginBottom: multiFundCard ? 10 : 14 }}>
                  <select value={form.multiSubclasse ?? ''} onChange={e => set('multiSubclasse', e.target.value)}>
                    <option value="">— Escolha a subclasse —</option>
                    {multiSubclasseOpts.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {multiFundCard && (
                  <div className="subclass-card-view" style={{ marginBottom: 14 }}>
                    <div className="subclass-card-nivel">Fundamental · {MULTI[form.multiCls!]?.nome}</div>
                    <div className="subclass-card-desc">{multiFundCard.descricao}</div>
                  </div>
                )}
                <div style={{ fontSize: '.6rem', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
                  Escolha o domínio
                </div>
                <div className="dom-row">
                  {MULTI[form.multiCls].doms.map((d, i) => {
                    const blocked = primaryDoms.includes(d);
                    return (
                      <div
                        key={d}
                        className={`dom-opt${form.multiDom === d ? ' sel' : ''}${blocked ? ' disabled' : ''}`}
                        title={blocked ? 'Domínio já pertence à sua classe principal' : undefined}
                        onClick={() => { if (!blocked) set('multiDom', d); }}
                      >
                        <div>{d}</div>
                        <div style={{ fontSize: '.65rem', color: 'var(--text-dim)', marginTop: 3 }}>
                          {blocked ? 'Já na classe principal' : `Domínio ${i + 1}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '.6rem', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
                    Habilidade de Multiclasse — {MULTI[form.multiCls].nome}
                  </div>
                  {MULTI[form.multiCls].habs.map(h => (
                    <div key={h.n} className="ca">
                      <div className="ca-name">{h.n}</div>
                      <div className="ca-desc">{h.d}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </CollapsibleSection>

      {/* EVOLUÇÃO */}
      <CollapsibleSection title="Evolução de Personagem">
        {EVO_TIERS.map(tier => {
          const [lo, hi] = TIER_RANGES[tier.key];
          const isActive = nivel >= lo && nivel <= hi;
          const isLocked = nivel < lo;
          return (
            <div key={tier.key} className={`evo-tier${isActive ? ' active' : ''}${isLocked ? ' locked' : ''}`}>
              <div className="evo-tier-hdr">
                {tier.label} — {tier.range}
                {isActive ? ' ★ Patamar Atual' : ''}
                {isLocked ? ` — disponível a partir do nível ${lo}` : ''}
              </div>
              <div className="evo-tier-note">📋 {tier.note}</div>
              <div className="evo-tier-inst">{tier.inst}</div>
              {tier.opts.map((opt, oi) => (
                <div key={opt.id + oi} className="evo-opt">
                  <div className="evo-chk-group">
                    {opt.checks === 1 ? (
                      <div
                        className={`evo-chk-lbl${evo[tier.key][opt.id] ? ' active' : ''}`}
                        onClick={() => setEvoCheck(tier.key, opt.id, !evo[tier.key][opt.id])}
                      >✓</div>
                    ) : (
                      Array.from({ length: opt.checks }, (_, s) => {
                        const key = `${opt.id}_${s}`;
                        return (
                          <div
                            key={s}
                            className={`evo-chk-lbl${evo[tier.key][key] ? ' active' : ''}`}
                            onClick={() => setEvoCheck(tier.key, key, !evo[tier.key][key])}
                          >✓</div>
                        );
                      })
                    )}
                  </div>
                  <div className="evo-opt-txt">{opt.label}</div>
                </div>
              ))}
              <div className="evo-tier-footer">🎯 {tier.footer}</div>
            </div>
          );
        })}
      </CollapsibleSection>

      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onDone}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave}>💾 Salvar Personagem</button>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

interface WeaponBlockProps {
  title: string;
  nome: string; attr: string; dados: string; hab: string; maos: string;
  onNome: (v: string) => void; onAttr: (v: string) => void; onDados: (v: string) => void;
  onHab: (v: string) => void; onMaos: (v: string) => void;
}

function WeaponBlock({ title, nome, attr, dados, hab, maos, onNome, onAttr, onDados, onHab, onMaos }: WeaponBlockProps) {
  return (
    <div className="wb">
      <h4>{title}</h4>
      <div className="frow"><div className="fg"><label>Nome</label>
        <input type="text" value={nome} placeholder="Ex: Rapieira" onChange={e => onNome(e.target.value)} />
      </div></div>
      <div className="frow c3">
        <div className="fg"><label>Atributo & Alcance</label>
          <input type="text" value={attr} placeholder="Ex: Presença CaC" onChange={e => onAttr(e.target.value)} />
        </div>
        <div className="fg"><label>Dano & Tipo</label>
          <input type="text" value={dados} placeholder="Ex: d8 fís" onChange={e => onDados(e.target.value)} />
        </div>
        <div className="fg"><label>Empunhadura</label>
          <select value={maos} onChange={e => onMaos(e.target.value)}>
            <option value="uma">Uma mão</option>
            <option value="duas">Duas mãos</option>
          </select>
        </div>
      </div>
      <div className="frow"><div className="fg"><label>Habilidade</label>
        <textarea value={hab} rows={2} placeholder="Habilidade especial da arma…" onChange={e => onHab(e.target.value)} />
      </div></div>
    </div>
  );
}

interface InvWeaponBlockProps extends WeaponBlockProps {
  tipo: string;
  onTipo: (v: string) => void;
}

interface CardGroupProps {
  title: ReactNode;
  children: ReactNode | ((query: string) => ReactNode);
  defaultOpen?: boolean;
  searchable?: boolean;
}

function CardGroup({ title, children, defaultOpen = true, searchable = false }: CardGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  return (
    <div className="card-group">
      <div className="card-group-hdr" onClick={() => setOpen(o => !o)}>
        <span className="card-group-arrow" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▼</span>
        <span className="card-group-title">{title}</span>
      </div>
      {open && (
        <div className="card-group-body">
          {searchable && (
            <input
              className="card-group-search"
              placeholder="Buscar carta…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          )}
          {typeof children === 'function' ? children(query) : children}
        </div>
      )}
    </div>
  );
}

function InvWeaponBlock({ title, nome, attr, dados, hab, maos, tipo, onNome, onAttr, onDados, onHab, onMaos, onTipo }: InvWeaponBlockProps) {
  return (
    <div className="wb">
      <h4>{title}</h4>
      <div className="frow"><div className="fg"><label>Nome</label>
        <input type="text" value={nome} onChange={e => onNome(e.target.value)} />
      </div></div>
      <div className="frow c3">
        <div className="fg"><label>Atributo & Alcance</label>
          <input type="text" value={attr} onChange={e => onAttr(e.target.value)} />
        </div>
        <div className="fg"><label>Dano & Tipo</label>
          <input type="text" value={dados} onChange={e => onDados(e.target.value)} />
        </div>
        <div className="fg"><label>Empunhadura</label>
          <select value={maos} onChange={e => onMaos(e.target.value)}>
            <option value="uma">Uma mão</option>
            <option value="duas">Duas mãos</option>
          </select>
        </div>
      </div>
      <div className="frow"><div className="fg"><label>Habilidade</label>
        <textarea value={hab} rows={2} onChange={e => onHab(e.target.value)} />
      </div></div>
      <div className="frow"><div className="fg"><label>Tipo</label>
        <select value={tipo} onChange={e => onTipo(e.target.value)}>
          <option value="">—</option>
          <option value="primaria">Primária</option>
          <option value="secundaria">Secundária</option>
        </select>
      </div></div>
    </div>
  );
}
