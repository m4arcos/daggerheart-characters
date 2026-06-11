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
        fontSize: '1rem', padding: 0, lineHeight: 1,
      }}
    >
      {showSenha ? '🙈' : '👁'}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/daggerheart-logo.svg" alt="Daggerheart" style={{ height: 90, display: 'block', margin: '0 auto' }} />
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 600 }}>Definir senha definitiva</h2>
          <p style={{ margin: '0 0 20px', color: 'var(--text-dim)', fontSize: '.85rem' }}>
            Olá, {user?.nome}! Como é seu primeiro acesso, defina uma senha permanente para continuar.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="field-label" htmlFor="sp-nova">Nova senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="sp-nova"
                  type={showSenha ? 'text' : 'password'}
                  className="inp"
                  value={novaSenha}
                  onChange={e => { setNovaSenha(e.target.value); setErro(''); }}
                  placeholder="Mínimo 6 caracteres"
                  style={{ paddingRight: 40 }}
                  required
                  autoFocus
                />
                {toggleBtn}
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="sp-confirmar">Confirmar senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="sp-confirmar"
                  type={showSenha ? 'text' : 'password'}
                  className="inp"
                  value={confirmar}
                  onChange={e => { setConfirmar(e.target.value); setErro(''); }}
                  placeholder="Repita a senha"
                  style={{ paddingRight: 40 }}
                  required
                />
                {toggleBtn}
              </div>
            </div>

            {erro && (
              <div style={{
                background: 'rgba(224, 90, 90, .15)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--r)',
                padding: '8px 12px',
                color: 'var(--danger)',
                fontSize: '.85rem',
              }}>
                {erro}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
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
