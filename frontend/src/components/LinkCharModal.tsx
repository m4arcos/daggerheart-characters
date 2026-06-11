import { useState } from 'react';
import { Character } from '../types/character';
import { CLS } from '../constants/cls';

interface CampaignOption {
  id: string;
  nome: string;
}

interface Props {
  campaigns?: CampaignOption[];           // modo lista: mostra seletor de campanha
  campaignId?: string;                    // modo detalhamento: campanha já definida
  campaignNome?: string;
  chars: Character[];                     // TODOS os personagens do usuário (exceto já nessa campanha)
  campaignNames?: Record<string, string>; // id → nome, para exibir qual campanha está vinculada
  onLink: (campaignId: string, charIds: string[]) => Promise<void>;
  onClose: () => void;
}

export default function LinkCharModal({ campaigns, campaignId, campaignNome, chars, campaignNames, onLink, onClose }: Props) {
  const [selectedCampaign, setSelectedCampaign] = useState(campaignId ?? '');
  const [selectedChars, setSelectedChars] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const modoCampanha = !campaignId;

  const available = chars.filter(c => !c.campaign_id);
  const blocked   = chars.filter(c => !!c.campaign_id);

  function toggleChar(id: string) {
    setSelectedChars(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function handleConfirm() {
    if (modoCampanha && !selectedCampaign) { setError('Selecione uma campanha.'); return; }
    if (selectedChars.size === 0) { setError('Selecione ao menos um personagem.'); return; }
    setLoading(true);
    setError('');
    try {
      await onLink(selectedCampaign, [...selectedChars]);
      onClose();
    } catch {
      setError('Erro ao vincular personagens. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function charSubtitle(c: Character) {
    return `${CLS[c.cls]?.nome ?? c.cls} · Nível ${c.nivel} · ${c.heranca}`;
  }

  return (
    <div className="modal-ov" onClick={onClose}>
      <div className="modal link-char-modal" onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>Vincular Personagens</h3>

        {!modoCampanha && campaignNome && (
          <p style={{ fontSize: '.78rem', color: 'var(--text-dim)', margin: '0 0 12px' }}>
            Campanha: <strong style={{ color: 'var(--accent)' }}>{campaignNome}</strong>
          </p>
        )}

        {/* Aviso */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, background: 'rgba(200,170,90,.07)', border: '1px solid rgba(200,170,90,.25)', borderRadius: 'var(--r)', padding: '8px 10px', marginBottom: 14, fontSize: '.75rem', color: 'var(--text-dim)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--hope)', flexShrink: 0, marginTop: 1 }}>info</span>
          Um personagem só pode estar vinculado a uma campanha por vez. Personagens já vinculados não podem ser selecionados.
        </div>

        {modoCampanha && campaigns && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '.65rem', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>
              Campanha
            </label>
            <select
              value={selectedCampaign}
              onChange={e => setSelectedCampaign(e.target.value)}
              style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', padding: '8px 10px', fontSize: '.85rem' }}
            >
              <option value="">— Selecione uma campanha —</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: '.65rem', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>
            Personagens ({selectedChars.size} selecionado{selectedChars.size !== 1 ? 's' : ''})
          </label>

          {chars.length === 0 ? (
            <p style={{ fontSize: '.82rem', color: 'var(--text-dim)', padding: '10px 0' }}>
              Nenhum personagem disponível para vincular.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
              {/* Disponíveis */}
              {available.map(c => {
                const checked = selectedChars.has(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleChar(c.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 'var(--r)', cursor: 'pointer',
                      border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                      background: checked ? 'rgba(200,170,90,.08)' : 'var(--surface2)',
                      transition: 'border-color .15s, background .15s',
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      border: `2px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                      background: checked ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {checked && <span style={{ color: '#12111a', fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{c.nome}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-dim)' }}>{charSubtitle(c)}</div>
                    </div>
                  </div>
                );
              })}

              {/* Bloqueados */}
              {blocked.map(c => {
                const campNome = c.campaign_id ? (campaignNames?.[c.campaign_id] ?? 'outra campanha') : '';
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 'var(--r)',
                      border: '1px solid var(--border)',
                      background: 'rgba(255,255,255,.02)',
                      opacity: 0.55, cursor: 'not-allowed',
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      border: '2px solid var(--border)',
                      background: 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'var(--text-dim)' }}>lock</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '.88rem', color: 'var(--text-dim)' }}>{c.nome}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-dim)' }}>{charSubtitle(c)}</div>
                    </div>
                    <span style={{ fontSize: '.65rem', color: 'var(--text-dim)', background: 'var(--surface3)', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {campNome}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: '.82rem', margin: '0 0 10px' }}>{error}</p>}

        <div className="modal-acts">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={loading || selectedChars.size === 0 || (modoCampanha && !selectedCampaign)}
          >
            {loading ? 'Vinculando…' : `Vincular${selectedChars.size > 0 ? ` (${selectedChars.size})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
