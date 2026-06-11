import { useState, useEffect } from 'react';
import { useCharStore } from './store/useCharStore';
import { useAuthStore } from './store/useAuthStore';
import ListScreen from './screens/ListScreen';
import FormScreen from './screens/FormScreen';
import SessionScreen from './screens/SessionScreen';
import CardsScreen from './screens/CardsScreen';
import CampaignListScreen from './screens/CampaignListScreen';
import CampaignScreen from './screens/CampaignScreen';
import { Character } from './types/character';
import LoginScreen from './screens/LoginScreen';
import SetPasswordScreen from './screens/SetPasswordScreen';
import Notif from './components/Notif';

type Screen = 'list' | 'form' | 'session' | 'cards' | 'campaigns' | 'campaign' | 'charview';

export default function App() {
  const { user, logout, refreshUser } = useAuthStore();
  const fetchChars = useCharStore(s => s.fetchChars);
  const [screen, setScreen] = useState<Screen>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  const [formCampaignId, setFormCampaignId] = useState<string | null>(null);
  const [viewOnlyChar, setViewOnlyChar] = useState<Character | null>(null);
  const [viewOnlyOwner, setViewOnlyOwner] = useState<string | undefined>(undefined);

  const isAuthenticated = !!user;
  const requiresPasswordChange = user?.requiresPasswordChange ?? false;

  useEffect(() => {
    if (isAuthenticated) refreshUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const goHome = () => { setScreen('list'); setEditId(null); setSessionId(null); setCurrentCampaignId(null); setFormCampaignId(null); };
  const goForm = (id?: string) => { setEditId(id ?? null); setFormCampaignId(null); setScreen('form'); };
  const goSession = (id: string) => { setSessionId(id); setScreen('session'); };
  const goCards = () => setScreen('cards');
  const [campaignsAutoCreate, setCampaignsAutoCreate] = useState(false);
  const goCampaigns = (autoCreate = false) => { setCampaignsAutoCreate(autoCreate); setScreen('campaigns'); };
  const goCampaign = (id: string) => { setCurrentCampaignId(id); setScreen('campaign'); };
  const goFormFromCampaign = (campId: string) => { setFormCampaignId(campId); setEditId(null); setScreen('form'); };
  const goViewOtherChar = (char: Character & { _owner?: { id: string; nome: string } }) => {
    setViewOnlyChar(char);
    setViewOnlyOwner(char._owner?.nome);
    setScreen('charview');
  };

  const subtitle =
    screen === 'form' ? (editId ? 'Editar Personagem' : 'Novo Personagem') :
    screen === 'session' ? 'Sessão' :
    screen === 'cards' ? 'Biblioteca de Cartas' :
    screen === 'campaigns' ? 'Campanhas' :
    screen === 'campaign' ? 'Campanha' :
    screen === 'charview' ? 'Ficha — Leitura' :
    'Fichas de Personagem';

  return (
    <>
      <div className="hdr">
        <div className="hdr-title" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={goHome}>
          <img src="/daggerheart-logo.svg" alt="" style={{ height: 26 }} />
          DAGGERHEART
        </div>
        <div className="hdr-sub">{subtitle}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {screen === 'list' && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={goCards}>🃏 Cartas</button>
              <button className="btn btn-ghost btn-sm" onClick={() => goCampaigns()}>Campanhas</button>
              <button className="btn btn-primary btn-sm" onClick={() => goCampaigns(true)}>+ Nova Campanha</button>
            </>
          )}
          {screen === 'campaign' && (
            <button className="btn btn-ghost btn-sm" onClick={goCampaigns}>← Campanhas</button>
          )}
          {screen === 'charview' && currentCampaignId && (
            <button className="btn btn-ghost btn-sm" onClick={() => goCampaign(currentCampaignId)}>← Campanha</button>
          )}
          {screen === 'form' && formCampaignId && (
            <button className="btn btn-ghost btn-sm" onClick={() => goCampaign(formCampaignId)}>← Campanha</button>
          )}
          {screen !== 'list' && screen !== 'campaign' && screen !== 'charview' && !(screen === 'form' && formCampaignId) && (
            <button className="btn btn-ghost btn-sm" onClick={goHome}>← Voltar</button>
          )}
          <span style={{ fontSize: '.75rem', color: 'var(--text-dim)' }}>{user.nome}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Sair</button>
        </div>
      </div>

      {screen === 'list' && <ListScreen onNew={() => goForm()} onEdit={goForm} onSession={goSession} onCampaign={goCampaign} />}
      {screen === 'form' && (
        <FormScreen
          editId={editId}
          onDone={formCampaignId ? () => goCampaign(formCampaignId) : goHome}
          campaignId={formCampaignId ?? undefined}
        />
      )}
      {screen === 'session' && sessionId && <SessionScreen charId={sessionId} onEdit={goForm} />}
      {screen === 'cards' && <CardsScreen />}
      {screen === 'campaigns' && <CampaignListScreen onCampaign={goCampaign} autoCreate={campaignsAutoCreate} />}
      {screen === 'campaign' && currentCampaignId && (
        <CampaignScreen
          campaignId={currentCampaignId}
          onNewChar={goFormFromCampaign}
          onViewChar={goSession}
          onEditChar={goForm}
          onViewOtherChar={goViewOtherChar}
        />
      )}
      {screen === 'charview' && viewOnlyChar && (
        <SessionScreen
          charId={viewOnlyChar.id}
          charData={viewOnlyChar}
          ownerNome={viewOnlyOwner}
          readOnly
          onEdit={() => {}}
        />
      )}

      <Notif />
    </>
  );
}
