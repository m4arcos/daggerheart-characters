import { useState, FormEvent } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export default function SetPasswordScreen() {
  const { setPassword, logout, user } = useAuthStore();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro('');
    if (novaSenha.length < 6) {
      setErro('A senha deve ter ao menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmar) {
      setErro('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      await setPassword(novaSenha);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao definir senha');
    } finally {
      setLoading(false);
    }
  }

  const toggleBtn = (
    <button
      type="button"
      onClick={() => setShowSenha(v => !v)}
      aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
      style={{
        position: 'absolute', right: 10, top: '50%',
        transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-dim)', padding: 0, lineHeight: 1,
        display: 'flex', alignItems: 'center',
        transition: 'color .15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
        {showSenha ? 'visibility_off' : 'visibility'}
      </span>
    </button>
  );

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        background: 'radial-gradient(circle at 50% 0%, rgba(200,170,90,0.09) 0%, transparent 55%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="/daggerheart-logo.svg"
            alt="Eldritch Archive"
            style={{ height: 72, display: 'block', margin: '0 auto 16px' }}
          />
          <h1 style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '1.4rem',
            fontWeight: 700,
            color: 'var(--accent)',
            letterSpacing: '-0.02em',
          }}>
            ELDRITCH ARCHIVE
          </h1>
        </div>

        <div className="glass-card" style={{ padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 6 }}>
            Definir senha definitiva
          </h2>
          <p style={{ margin: '0 0 20px', color: 'var(--text-dim)', fontSize: '.88rem', lineHeight: 1.5 }}>
            Olá, {user?.nome}! Como é seu primeiro acesso, defina uma senha permanente para continuar.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="field-label" htmlFor="sp-nova">Nova senha</label>
              <div style={{ position: 'relative' }}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-dim)', fontSize: 17, pointerEvents: 'none',
                  }}
                >
                  lock
                </span>
                <input
                  id="sp-nova"
                  type={showSenha ? 'text' : 'password'}
                  className="inp"
                  value={novaSenha}
                  onChange={e => { setNovaSenha(e.target.value); setErro(''); }}
                  placeholder="Mínimo 6 caracteres"
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                  required
                  autoFocus
                />
                {toggleBtn}
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="sp-confirmar">Confirmar senha</label>
              <div style={{ position: 'relative' }}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-dim)', fontSize: 17, pointerEvents: 'none',
                  }}
                >
                  lock_reset
                </span>
                <input
                  id="sp-confirmar"
                  type={showSenha ? 'text' : 'password'}
                  className="inp"
                  value={confirmar}
                  onChange={e => { setConfirmar(e.target.value); setErro(''); }}
                  placeholder="Repita a senha"
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                  required
                />
                {toggleBtn}
              </div>
            </div>

            {erro && (
              <div style={{
                background: 'rgba(192, 57, 43, .15)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--r)',
                padding: '10px 12px',
                color: '#ff8a80',
                fontSize: '.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#ff8a80', flexShrink: 0 }}>error</span>
                {erro}
              </div>
            )}

            <button
              type="submit"
              className="btn-gold-shimmer"
              disabled={loading}
              style={{ marginTop: 4 }}
            >
              {loading ? 'Salvando…' : 'Definir senha e continuar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 12 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={logout}
            style={{ fontSize: '.75rem', color: 'var(--text-dim)' }}
          >
            Cancelar e sair
          </button>
        </p>
      </div>
    </div>
  );
}
