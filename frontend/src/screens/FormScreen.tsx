import { useState, useEffect } from 'react';
import { useCharStore } from '../store/useCharStore';
import { Character, ExpEntry, InvEntry, EvoState, uid, makeDefaultCharacter } from '../types/character';
import { CLS } from '../constants/cls';
import { MULTI } from '../constants/multi';
import { EVO_TIERS, TIER_RANGES } from '../constants/evo';
import CollapsibleSection from '../components/CollapsibleSection';

interface Props {
  editId: string | null;
  onDone: () => void;
}

type FormState = Omit<Character, 'id'>;

function buildForm(c?: Character): FormState {
  if (c) {
    const { id: _id, ...rest } = c;
    return rest;
  }
  return makeDefaultCharacter() as FormState;
}

export default function FormScreen({ editId, onDone }: Props) {
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

  useEffect(() => {
    const c = editId ? chars.find(x => x.id === editId) : undefined;
    if (c) {
      setForm(buildForm(c));
      setExps(c.exps?.length ? c.exps : Array(5).fill(null).map(() => ({ nome: '', val: 0 })));
      setInv(c.inv || []);
      setEvo(c.evo || { p2: {}, p3: {}, p4: {} });
    }
  }, [editId]);

  const set = (field: keyof FormState, value: unknown) =>
    setForm(f => ({ ...f, [field]: value }));

  const num = (v: string, fallback = 0) => parseInt(v) || fallback;

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
              }}
            >
              <div className="cls-opt-name">{v.nome}</div>
              <div className="cls-opt-sub">{v.sub}</div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* IDENTIDADE */}
      <CollapsibleSection title="Identidade">
        <div className="frow c3">
          <div className="fg"><label>Nome</label>
            <input type="text" value={form.nome} placeholder="Nome do personagem" onChange={e => set('nome', e.target.value)} />
          </div>
          <div className="fg"><label>Herança</label>
            <input type="text" value={form.heranca} placeholder="Ex: Humano, Elfo…" onChange={e => set('heranca', e.target.value)} />
          </div>
          <div className="fg"><label>Gênero</label>
            <input type="text" value={form.genero} placeholder="Ex: Masculino…" onChange={e => set('genero', e.target.value)} />
          </div>
        </div>
        <div className="frow c3">
          <div className="fg"><label>Subclasse</label>
            <input type="text" value={form.subclasse} placeholder="Ex: Baluarte…" onChange={e => set('subclasse', e.target.value)} />
          </div>
          <div className="fg"><label>Nível</label>
            <input type="number" inputMode="numeric" min={1} max={10} step={1} value={form.nivel}
              onChange={e => set('nivel', num(e.target.value, 1))} />
          </div>
          <div className="fg"><label>Proficiência</label>
            <input type="number" inputMode="numeric" min={1} max={6} step={1} value={form.prof}
              onChange={e => set('prof', num(e.target.value, 1))} />
          </div>
        </div>
      </CollapsibleSection>

      {/* ATRIBUTOS */}
      <CollapsibleSection title="Atributos">
        <div className="frow c6">
          {(['agi', 'for', 'acu', 'ins', 'pre', 'con'] as const).map(a => {
            const labels: Record<string, string> = { agi: 'Agilidade', for: 'Força', acu: 'Acuidade', ins: 'Instinto', pre: 'Presença', con: 'Conhecimento' };
            return (
              <div key={a} className="fg">
                <label>{labels[a]}</label>
                <input type="number" className="attr-in" value={form[a]}
                  onChange={e => set(a, num(e.target.value))} />
              </div>
            );
          })}
        </div>
        <div className="frow c6">
          {(['agi', 'for', 'acu', 'ins', 'pre', 'con'] as const).map(a => {
            const upKey = `${a}Up` as keyof FormState;
            const checked = !!form[upKey];
            return (
              <div key={a} className="fg">
                <label>↑ Evoluído</label>
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
            <input type="number" inputMode="numeric" min={0} step={1} value={form.evBonus} onChange={e => set('evBonus', num(e.target.value))} />
          </div>
          <div className="fg"><label>PV Máximo</label>
            <input type="number" inputMode="numeric" min={1} step={1} value={form.pvMax} onChange={e => set('pvMax', num(e.target.value, 1))} />
          </div>
          <div className="fg"><label>PF Máximo (Fadiga)</label>
            <input type="number" inputMode="numeric" min={1} step={1} value={form.pfMax} onChange={e => set('pfMax', num(e.target.value, 1))} />
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
            <input type="number" inputMode="numeric" min={0} step={1} value={form.dm} placeholder="Ex: 5" onChange={e => set('dm', num(e.target.value))} />
          </div>
          <div className="fg"><label>Limiar Grave</label>
            <input type="number" inputMode="numeric" min={0} step={1} value={form.dG} placeholder="Ex: 11" onChange={e => set('dG', num(e.target.value))} />
          </div>
        </div>
      </CollapsibleSection>

      {/* ARMAS ATIVAS */}
      <CollapsibleSection title="Armas Ativas">
        <div className="frow c2">
          <WeaponBlock
            title="Principal"
            nome={form.wpNome} attr={form.wpAttr} dados={form.wpDados} hab={form.wpHab} maos={form.wpMaos}
            onNome={v => set('wpNome', v)} onAttr={v => set('wpAttr', v)} onDados={v => set('wpDados', v)}
            onHab={v => set('wpHab', v)} onMaos={v => set('wpMaos', v as 'uma' | 'duas')}
          />
          <WeaponBlock
            title="Secundária"
            nome={form.wsNome} attr={form.wsAttr} dados={form.wsDados} hab={form.wsHab} maos={form.wsMaos}
            onNome={v => set('wsNome', v)} onAttr={v => set('wsAttr', v)} onDados={v => set('wsDados', v)}
            onHab={v => set('wsHab', v)} onMaos={v => set('wsMaos', v as 'uma' | 'duas')}
          />
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
            <input type="number" inputMode="numeric" min={0} step={1} value={form.armBase} onChange={e => set('armBase', num(e.target.value))} />
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
            <input
              type="number" value={exp.val}
              onChange={e => updateExp(i, 'val', num(e.target.value))}
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
          <div className="fg"><label>Punhados</label><input type="number" inputMode="numeric" min={0} step={1} value={form.gP} onChange={e => set('gP', num(e.target.value))} /></div>
          <div className="fg"><label>Bolsas</label><input type="number" inputMode="numeric" min={0} step={1} value={form.gB} onChange={e => set('gB', num(e.target.value))} /></div>
          <div className="fg"><label>Baú</label><input type="number" inputMode="numeric" min={0} step={1} value={form.gBau} onChange={e => set('gBau', num(e.target.value))} /></div>
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
                  <input type="number" inputMode="numeric" min={1} step={1} value={item.qtd} onChange={e => updateInv(i, 'qtd', num(e.target.value, 1))} style={{ textAlign: 'center' }} />
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

      {/* MULTICLASSE */}
      <CollapsibleSection title="Multiclasse">
        <label className="multi-toggle">
          <input type="checkbox" checked={form.multiEnabled}
            onChange={e => {
              set('multiEnabled', e.target.checked);
              if (!e.target.checked) { set('multiCls', null); set('multiDom', null); }
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
                  onClick={() => { if (k !== form.cls) { set('multiCls', k); set('multiDom', null); } }}
                >
                  {m.nome}
                </div>
              ))}
            </div>

            {form.multiCls && MULTI[form.multiCls] && (
              <>
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
          return (
            <div key={tier.key} className={`evo-tier${isActive ? ' active' : ''}`}>
              <div className="evo-tier-hdr">
                {tier.label} — {tier.range}{isActive ? ' ★ Patamar Atual' : ''}
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
        <div className="fg"><label>Dados & Tipo</label>
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
        <div className="fg"><label>Dados & Tipo</label>
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
