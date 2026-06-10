import { useState, useEffect } from 'react';
import { useCharStore } from './store/useCharStore';
import { useAuthStore } from './store/useAuthStore';
import ListScreen from './screens/ListScreen';
import FormScreen from './screens/FormScreen';
import SessionScreen from './screens/SessionScreen';
import CardsScreen from './screens/CardsScreen';
import LoginScreen from './screens/LoginScreen';
import SetPasswordScreen from './screens/SetPasswordScreen';
import Notif from './components/Notif';

type Screen = 'list' | 'form' | 'session' | 'cards';

export default function App() {
  const { user, logout } = useAuthStore();
  const fetchChars = useCharStore(s => s.fetchChars);
  const [screen, setScreen] = useState<Screen>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const isAuthenticated = !!user;
  const requiresPasswordChange = user?.requiresPasswordChange ?? false;

  useEffect(() => {
    if (isAuthenticated && !requiresPasswordChange) {
      fetchChars();
    }
  }, [isAuthenticated, requiresPasswordChange, fetchChars]);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (requiresPasswordChange) {
    return <SetPasswordScreen />;
  }

  const goHome = () => { setScreen('list'); setEditId(null); setSessionId(null); };
  const goForm = (id?: string) => { setEditId(id ?? null); setScreen('form'); };
  const goSession = (id: string) => { setSessionId(id); setScreen('session'); };
  const goCards = () => setScreen('cards');

  const subtitle =
    screen === 'form' ? (editId ? 'Editar Personagem' : 'Novo Personagem') :
    screen === 'session' ? 'Sessão' :
    screen === 'cards' ? 'Biblioteca de Cartas' :
    'Fichas de Personagem';

  return (
    <>
      <div className="hdr">
        <div className="hdr-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/daggerheart-logo.svg" alt="" style={{ height: 26 }} />
          DAGGERHEART
        </div>
        <div className="hdr-sub">{subtitle}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {screen === 'list' && (
            <button className="btn btn-ghost btn-sm" onClick={goCards}>🃏 Cartas</button>
          )}
          {screen !== 'list' && (
            <button className="btn btn-ghost btn-sm" onClick={goHome}>← Voltar</button>
          )}
          <span style={{ fontSize: '.75rem', color: 'var(--text-dim)' }}>{user.nome}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Sair</button>
        </div>
      </div>

      {screen === 'list' && <ListScreen onNew={() => goForm()} onEdit={goForm} onSession={goSession} />}
      {screen === 'form' && <FormScreen editId={editId} onDone={goHome} />}
      {screen === 'session' && sessionId && <SessionScreen charId={sessionId} onEdit={goForm} />}
      {screen === 'cards' && <CardsScreen />}

      <Notif />
    </>
  );
}
