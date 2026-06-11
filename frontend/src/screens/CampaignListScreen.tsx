import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Campaign } from '../types/campaign';
import { useAuthStore } from '../store/useAuthStore';

interface Props {
  onCampaign: (id: string) => void;
  autoCreate?: boolean;
}

export default function CampaignListScreen({ onCampaign, autoCreate }: Props) {
  const user = useAuthStore(s => s.user);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  async function loadCampaigns() {
    setLoading(true);
    setError('');
    try {
      const data = await api.campaigns.list();
      setCampaigns(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar campanhas';
      try { setError(JSON.parse(msg).error ?? msg); } catch { setError(msg); }
    } finally {
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

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinError('');
    setJoinSuccess('');
    try {
      const res = await api.campaigns.join(joinCode.trim().toUpperCase());
      setJoinCode('');
      setJoinSuccess(`Solicitação enviada para "${res.campaign_nome}"! Aguarde aprovação do mestre.`);
      await loadCampaigns();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao entrar na campanha';
      try { setJoinError(JSON.parse(msg).error ?? msg); } catch { setJoinError(msg); }
    } finally {
      setJoinLoading(false);
    }
  }

  return (
    <div className="list-wrap">
      <div className="list-top">
        <h2>{campaigns.length} {campaigns.length !== 1 ? 'campanhas' : 'campanha'}</h2>
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', background: 'var(--surface2)', padding: '10px 14px', borderRadius: 'var(--r)', marginBottom: 16, fontSize: '.85rem' }}>
          {error}
        </div>
      )}

      {/* Lista de campanhas */}
      {loading ? (
        <p style={{ color: 'var(--text-dim)', fontSize: '.85rem' }}>Carregando…</p>
      ) : campaigns.length === 0 ? (
        <div className="empty-state">
          <h3>Nenhuma campanha ainda</h3>
          <p>Crie uma campanha ou entre com um código do mestre.</p>
        </div>
      ) : (
        <div className="char-grid">
          {campaigns.map(c => (
            <div key={c.id} className="char-card" onClick={() => onCampaign(c.id)}>
              <div className="cc-cls">
                {c.meu_status === 'aprovado' ? (
                  <span style={{ color: 'var(--ok)', fontSize: '.72rem' }}>Aprovado</span>
                ) : (
                  <span style={{ color: 'var(--hope)', fontSize: '.72rem' }}>Pendente</span>
                )}
                {' · '}
                <span style={{ color: 'var(--text-dim)', fontSize: '.72rem' }}>{c.total_membros} membro{c.total_membros !== 1 ? 's' : ''}</span>
              </div>
              <div className="cc-name">{c.nome}</div>
              <div className="cc-sub">Mestre: {c.criador_nome}</div>
              {c.criador_id === user?.userId && (
                <div style={{ fontFamily: 'monospace', fontSize: '.85rem', color: 'var(--accent)', background: 'var(--surface2)', borderRadius: 4, padding: '2px 8px', display: 'inline-block', marginTop: 4, letterSpacing: 2 }}>
                  {c.codigo}
                </div>
              )}
              <div className="cc-acts" onClick={e => e.stopPropagation()}>
                <button className="btn btn-primary btn-sm" onClick={() => onCampaign(c.id)}>
                  Ver Campanha
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
        {/* Criar campanha */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16 }}>
          <div style={{ fontSize: '.65rem', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 12 }}>
            Criar Campanha
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
                placeholder="Ex: A Maldição de Ravenloft"
                required
              />
            </div>
            {createError && <div style={{ color: 'var(--danger)', fontSize: '.82rem' }}>{createError}</div>}
            <button type="submit" className="btn btn-primary btn-sm" disabled={createLoading}>
              {createLoading ? 'Criando…' : '+ Criar'}
            </button>
          </form>
        </div>

        {/* Entrar com código */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16 }}>
          <div style={{ fontSize: '.65rem', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 12 }}>
            Entrar com Código
          </div>
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label className="field-label">Código da campanha (6 caracteres)</label>
              <input
                className="inp"
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="Ex: ABC123"
                maxLength={6}
                style={{ fontFamily: 'monospace', letterSpacing: 3, textTransform: 'uppercase' }}
              />
            </div>
            {joinError && <div style={{ color: 'var(--danger)', fontSize: '.82rem' }}>{joinError}</div>}
            {joinSuccess && <div style={{ color: 'var(--ok)', fontSize: '.82rem' }}>{joinSuccess}</div>}
            <button type="submit" className="btn btn-ghost btn-sm" disabled={joinLoading}>
              {joinLoading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
