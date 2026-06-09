import { useState, useEffect } from 'react';
import { useCharStore } from './store/useCharStore';
import ListScreen from './screens/ListScreen';
import FormScreen from './screens/FormScreen';
import SessionScreen from './screens/SessionScreen';
import Notif from './components/Notif';

type Screen = 'list' | 'form' | 'session';

export default function App() {
  const fetchChars = useCharStore(s => s.fetchChars);
  const [screen, setScreen] = useState<Screen>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => { fetchChars(); }, [fetchChars]);

  const goHome = () => { setScreen('list'); setEditId(null); setSessionId(null); };
  const goForm = (id?: string) => { setEditId(id ?? null); setScreen('form'); };
  const goSession = (id: string) => { setSessionId(id); setScreen('session'); };

  const subtitle =
    screen === 'form' ? (editId ? 'Editar Personagem' : 'Novo Personagem') :
    screen === 'session' ? 'Sessão' : 'Fichas de Personagem';

  return (
    <>
      <div className="hdr">
        <div className="hdr-title">⚔ DAGGERHEART</div>
        <div className="hdr-sub">{subtitle}</div>
        {screen !== 'list' && (
          <button className="btn btn-ghost btn-sm" onClick={goHome}>← Voltar</button>
        )}
      </div>

      {screen === 'list' && <ListScreen onNew={() => goForm()} onEdit={goForm} onSession={goSession} />}
      {screen === 'form' && <FormScreen editId={editId} onDone={goHome} />}
      {screen === 'session' && sessionId && <SessionScreen charId={sessionId} onEdit={goForm} />}

      <Notif />
    </>
  );
}
