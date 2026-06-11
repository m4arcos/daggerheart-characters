import { useState, FormEvent } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export default function LoginScreen() {
  const { login, loginError, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await login(email, senha);
    setLoading(false);
  }

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
      {/* Atmospheric background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        background: 'radial-gradient(circle at 50% 0%, rgba(200,170,90,0.09) 0%, transparent 55%)',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 380 }}>

        {/* Logo section */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 20px' }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(200,170,90,0.12)',
              filter: 'blur(18px)',
              animation: 'pulse 3s ease-in-out infinite',
            }} />
            <img
              src="/daggerheart-logo.svg"
              alt="Eldritch Archive"
              style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <h1 style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '1.4rem',
            fontWeight: 700,
            color: 'var(--accent)',
            letterSpacing: '-0.02em',
            marginBottom: 6,
          }}>
            ELDRITCH ARCHIVE
          </h1>
          <p style={{
            fontSize: '0.62rem',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
            fontWeight: 700,
          }}>
            Daggerheart Character System
          </p>
        </div>

        {/* Login card */}
        <div className="corner-wrapper">
          <div className="corner-bracket tl" />
          <div className="corner-bracket tr" />
          <div className="corner-bracket bl" />
          <div className="corner-bracket br" />
        <div className="glass-card" style={{ padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 4, letterSpacing: '-0.01em' }}>
            Entre no Arquivo
          </h2>
          <p style={{ fontSize: '.9rem', color: 'var(--text-dim)', marginBottom: 24, lineHeight: 1.5 }}>
            Suas lendas aguardam no abismo.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Email field */}
            <div>
              <label className="field-label" htmlFor="login-email" style={{ paddingLeft: 2 }}>
                Identidade do Viajante
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-dim)', fontSize: 17, pointerEvents: 'none',
                  }}
                >
                  mail
                </span>
                <input
                  id="login-email"
                  type="email"
                  className="inp"
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearError(); }}
                  placeholder="viajante@daggerheart.com"
                  style={{ paddingLeft: 36 }}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="field-label" htmlFor="login-senha" style={{ paddingLeft: 2 }}>
                Chave do Grimório
              </label>
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
                  id="login-senha"
                  type={showSenha ? 'text' : 'password'}
                  className="inp"
                  value={senha}
                  onChange={e => { setSenha(e.target.value); clearError(); }}
                  placeholder="••••••••"
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(v => !v)}
                  aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
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
              </div>
            </div>

            {/* Error message */}
            {loginError && (
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
                {loginError}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              className="btn-gold-shimmer"
              disabled={loading}
              style={{ marginTop: 4 }}
            >
              {loading ? 'Entrando…' : 'Entrar →'}
            </button>
          </form>
        </div>
        </div>{/* /corner-wrapper */}

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          color: 'var(--text-dim)',
          fontSize: '.72rem',
          marginTop: 16,
          letterSpacing: '0.05em',
          lineHeight: 1.6,
        }}>
          Acesso restrito — fale com o administrador para obter sua conta.
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
