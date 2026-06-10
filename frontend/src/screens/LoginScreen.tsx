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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/daggerheart-logo.svg" alt="Daggerheart" style={{ height: 90, display: 'block', margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-dim)', fontSize: '.85rem' }}>
            Fichas de Personagem
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 600 }}>Entrar</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="field-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                className="inp"
                value={email}
                onChange={e => { setEmail(e.target.value); clearError(); }}
                placeholder="seu@email.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="field-label" htmlFor="login-senha">Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-senha"
                  type={showSenha ? 'text' : 'password'}
                  className="inp"
                  value={senha}
                  onChange={e => { setSenha(e.target.value); clearError(); }}
                  placeholder="••••••••"
                  style={{ paddingRight: 40 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-dim)', fontSize: '.9rem', padding: 0, lineHeight: 1,
                  }}
                  aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showSenha ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {loginError && (
              <div style={{
                background: 'rgba(224, 90, 90, .15)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--r)',
                padding: '8px 12px',
                color: 'var(--danger)',
                fontSize: '.85rem',
              }}>
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ marginTop: 4 }}
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '.75rem', marginTop: 16 }}>
          Acesso restrito — fale com o administrador para obter sua conta.
        </p>
      </div>
    </div>
  );
}
