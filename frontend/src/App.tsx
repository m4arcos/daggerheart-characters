import { useState, useEffect } from 'react';
import { useCharStore } from './store/useCharStore';
import { useAuthStore } from './store/useAuthStore';
import ListScreen from './screens/ListScreen';
import FormScreen from './screens/FormScreen';
import SessionScreen from './screens/SessionScreen';
import CardsScreen from './screens/CardsScreen';
import CampaignListScreen from './screens/CampaignListScreen';
import CampaignScreen from './screens/CampaignScreen';
import AdminScreen from './screens/AdminScreen';
import { Character } from './types/character';
import LoginScreen from './screens/LoginScreen';
import SetPasswordScreen from './screens/SetPasswordScreen';
import Notif from './components/Notif';

type Screen = 'list' | 'form' | 'session' | 'cards' | 'campaigns' | 'campaign' | 'charview' | 'admin';

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
  const [campaignsAutoCreate, setCampaignsAutoCreate] = useState(false);

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

  const isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;

  const goHome = () => { setScreen('list'); setEditId(null); setSessionId(null); setCurrentCampaignId(null); setFormCampaignId(null); };
  const goAdmin = () => setScreen('admin');
  const goForm = (id?: string) => { setEditId(id ?? null); setFormCampaignId(null); setScreen('form'); };
  const goSession = (id: string) => { setSessionId(id); setScreen('session'); };
  const goCards = () => setScreen('cards');
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

  const sidebarNavItems = [
    { key: 'cards',    label: 'Grimório',    icon: 'menu_book', action: goCards,            active: screen === 'cards' },
    { key: 'camps',    label: 'Campanhas',   icon: 'fort',      action: () => goCampaigns(), active: ['campaigns', 'campaign'].includes(screen) },
    { key: 'chars',    label: 'Personagens', icon: 'person',    action: goHome,              active: ['list', 'session', 'form', 'charview'].includes(screen) },
  ];

  return (
    <>
      <div className="app-layout">
        {/* ── SIDEBAR (desktop only) ── */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-brand" onClick={goHome}>
              <img src="/daggerheart-logo.svg" alt="Daggerheart" className="sidebar-logo-img" />
              <div className="sidebar-logo-text">
                <span className="sidebar-logo-title">Daggerheart</span>
                <span className="sidebar-logo-sub">RPG Manager</span>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Navegação principal">
            <span className="sidebar-section-label">Menu</span>
            {sidebarNavItems.map(item => (
              <button
                key={item.key}
                className={`sidebar-nav-item${item.active ? ' active' : ''}`}
                onClick={item.action}
                aria-current={item.active ? 'page' : undefined}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
            <button className="sidebar-nav-item disabled" aria-disabled="true">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">lock</span>
              Cofre
            </button>
            {isAdmin && (
              <button
                className={`sidebar-nav-item${screen === 'admin' ? ' active' : ''}`}
                onClick={goAdmin}
                aria-current={screen === 'admin' ? 'page' : undefined}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">manage_accounts</span>
                Configurações
              </button>
            )}
          </nav>

          <div className="sidebar-footer">
            <button className="sidebar-new-char" onClick={() => goForm()}>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }} aria-hidden="true">add</span>
              Novo Personagem
            </button>

            <div className="sidebar-user">
              <div className="sidebar-user-avatar" aria-hidden="true">
                {user.nome.charAt(0).toUpperCase()}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user.nome}</div>
                <div className="sidebar-user-status">Logado</div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={logout}
                title={`Sair — ${user.nome}`}
                style={{ padding: '4px 6px', flexShrink: 0 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <div className="app-content">
          {/* Mobile header */}
          <header className="hdr">
            <div className="hdr-brand" onClick={goHome} style={{ cursor: 'pointer' }}>
              <img src="/daggerheart-logo.svg" alt="Daggerheart" className="hdr-logo-img" />
              <span className="hdr-title">Daggerheart</span>
            </div>
            <div className="hdr-sub">{subtitle}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {screen === 'campaign' && (
                <button className="btn btn-ghost btn-sm" onClick={goCampaigns}>← Campanhas</button>
              )}
              {(screen === 'charview' || screen === 'session') && currentCampaignId && (
                <button className="btn btn-ghost btn-sm" onClick={() => goCampaign(currentCampaignId)}>← Campanha</button>
              )}
              {screen !== 'list' && screen !== 'campaign' && screen !== 'charview' && screen !== 'form' && !(screen === 'session' && currentCampaignId) && (
                <button className="btn btn-ghost btn-sm" onClick={goHome}>← Voltar</button>
              )}
              <button
                className="btn btn-ghost btn-sm"
                onClick={logout}
                title={`Sair — ${user.nome}`}
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>logout</span>
              </button>
            </div>
          </header>

          {screen === 'list' && <ListScreen onNew={() => goForm()} onEdit={goForm} onSession={goSession} onCampaign={goCampaign} />}
          {screen === 'form' && (
            <FormScreen
              editId={editId}
              onDone={formCampaignId ? () => goCampaign(formCampaignId) : goHome}
              campaignId={formCampaignId ?? undefined}
            />
          )}
          {screen === 'session' && sessionId && (
            <SessionScreen
              charId={sessionId}
              onEdit={goForm}
              onBackToCampaign={currentCampaignId ? () => goCampaign(currentCampaignId) : undefined}
            />
          )}
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
              onBackToCampaign={currentCampaignId ? () => goCampaign(currentCampaignId) : undefined}
            />
          )}
          {screen === 'admin' && isAdmin && <AdminScreen />}

          {/* ── MOBILE BOTTOM NAV ── */}
          <nav className="bottom-nav">
            <button
              className={`bottom-nav-btn ${['list', 'session', 'form', 'charview'].includes(screen) ? 'bottom-nav-active' : ''}`}
              onClick={goHome}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>person</span>
              <span>Personagens</span>
            </button>
            <button
              className={`bottom-nav-btn ${['campaigns', 'campaign'].includes(screen) ? 'bottom-nav-active' : ''}`}
              onClick={() => goCampaigns()}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>groups</span>
              <span>Campanhas</span>
            </button>
            <button
              className={`bottom-nav-btn ${screen === 'cards' ? 'bottom-nav-active' : ''}`}
              onClick={goCards}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>style</span>
              <span>Cartas</span>
            </button>
          </nav>
        </div>
      </div>

      <Notif />
    </>
  );
}
