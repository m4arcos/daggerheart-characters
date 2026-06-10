import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import {
  Card, CardTipo, DomainKey, TipoCartaDominio,
  DOMAIN_LABELS, DOMAIN_KEYS, CLASS_LABELS, CLASS_KEYS, CARD_TIPO_LABELS,
} from '../types/cards'

const TIPO_TABS: { key: CardTipo | ''; label: string }[] = [
  { key: '', label: 'Todos' },
  { key: 'subclasse', label: 'Subclasses' },
  { key: 'dominio', label: 'Domínios' },
  { key: 'ancestralidade', label: 'Ancestralidades' },
  { key: 'comunidade', label: 'Comunidades' },
]

const TIPO_LABELS: Record<CardTipo, string> = {
  subclasse: 'Subclasse',
  dominio: 'Domínio',
  ancestralidade: 'Ancestralidade',
  comunidade: 'Comunidade',
}

function domTagClass(key: string) {
  return `card-tag card-tag-dom card-tag-dom-${key}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CardTags({ card }: { card: Card }) {
  return (
    <>
      {card.tipo === 'dominio' && card.dominio_key && (
        <span className={domTagClass(card.dominio_key)}>
          {DOMAIN_LABELS[card.dominio_key as DomainKey]}
        </span>
      )}
      {card.tipo === 'subclasse' && (
        <>
          <span className="card-tag card-tag-cls">{card.nome_classe}</span>
          {card.dominio_key && (
            <span className={domTagClass(card.dominio_key)}>
              {DOMAIN_LABELS[card.dominio_key as DomainKey]}
            </span>
          )}
        </>
      )}
      {card.tipo === 'ancestralidade' && (
        <span className="card-tag card-tag-anc">Ancestralidade</span>
      )}
      {card.tipo === 'comunidade' && (
        <span className="card-tag card-tag-com">Comunidade</span>
      )}
      {card.tipo === 'dominio' && card.nivel_dominio != null && (
        <span className="card-tag card-tag-nivel">Nv. {card.nivel_dominio}</span>
      )}
      {card.tipo === 'dominio' && card.card_tipo && (
        <span className="card-tag card-tag-tipo">{card.card_tipo}</span>
      )}
    </>
  )
}

function CardTitle({ card }: { card: Card }) {
  if (card.tipo === 'subclasse') {
    return (
      <>
        <span>{card.subclasse_nome}</span>
        <span className="card-item-level"> · {card.nivel_subclasse}</span>
      </>
    )
  }
  return <>{card.nome}</>
}

function CardItem({ card, onClick }: { card: Card; onClick: () => void }) {
  return (
    <div className="card-item" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div className="card-item-header">
        <div className="card-item-tags"><CardTags card={card} /></div>
        <span className="card-num">#{String(card.num).padStart(3, '0')}</span>
      </div>
      <div className="card-item-name"><CardTitle card={card} /></div>
      {card.tipo === 'subclasse' && card.atributo_conjuracao && (
        <div className="card-item-meta">Conjuração: {card.atributo_conjuracao}</div>
      )}
      {card.tipo === 'dominio' && card.custo != null && (
        <div className="card-item-meta">
          {card.custo === 0 ? 'Sem custo de troca' : `Custo de Troca: ${card.custo} PF`}
        </div>
      )}
      <div className="card-item-desc">{card.descricao}</div>
    </div>
  )
}

function CardModal({ card, onClose }: { card: Card; onClose: () => void }) {
  return (
    <div className="modal-ov" onClick={onClose}>
      <div className="modal card-modal" onClick={e => e.stopPropagation()}>
        <div className="card-modal-hdr">
          <div>
            <div className="card-item-tags" style={{ marginBottom: '6px' }}>
              <CardTags card={card} />
              <span className="card-num">#{String(card.num).padStart(3, '0')}</span>
            </div>
            <div className="card-modal-name"><CardTitle card={card} /></div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ flexShrink: 0 }}>✕</button>
        </div>

        {(card.atributo_conjuracao || card.custo != null) && (
          <div className="card-modal-meta">
            {card.atributo_conjuracao && (
              <span>Conjuração: <strong>{card.atributo_conjuracao}</strong></span>
            )}
            {card.custo != null && (
              <span>
                Custo de Troca: <strong>{card.custo === 0 ? '—' : `${card.custo} PF`}</strong>
              </span>
            )}
          </div>
        )}

        <div className="card-modal-desc">{card.descricao}</div>
      </div>
    </div>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CardsScreen() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Card | null>(null)

  const [tipo, setTipo] = useState<CardTipo | ''>('')
  const [dominioKey, setDominioKey] = useState<DomainKey | ''>('')
  const [cardTipo, setCardTipo] = useState<TipoCartaDominio | ''>('')
  const [classe, setClasse] = useState('')
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 350)
    return () => clearTimeout(t)
  }, [qInput])

  const fetchCards = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.cards.getAll({
        tipo: tipo || undefined,
        dominio_key: dominioKey || undefined,
        q: q || undefined,
        card_tipo: cardTipo || undefined,
        classe: classe || undefined,
      })
      setCards(data)
    } catch {
      setCards([])
    } finally {
      setLoading(false)
    }
  }, [tipo, dominioKey, q, cardTipo, classe])

  useEffect(() => { fetchCards() }, [fetchCards])

  const handleTipoChange = (newTipo: CardTipo | '') => {
    setTipo(newTipo)
    setCardTipo('')
    setClasse('')
    if (newTipo === 'ancestralidade' || newTipo === 'comunidade') {
      setDominioKey('')
    }
  }

  const showDomainFilter = tipo === '' || tipo === 'subclasse' || tipo === 'dominio'
  const showCardTipoFilter = tipo === '' || tipo === 'dominio'
  const showClasseFilter = tipo === 'subclasse'

  const hasFilters = tipo || dominioKey || q || cardTipo || classe

  return (
    <div className="cards-wrap">
      {/* Search */}
      <div className="cards-top">
        <input
          className="cards-search"
          placeholder="Buscar por nome ou descrição..."
          value={qInput}
          onChange={e => setQInput(e.target.value)}
        />
      </div>

      {/* Type tabs */}
      <div className="filter-row">
        {TIPO_TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`pill ${tipo === key ? 'active' : ''}`}
            onClick={() => handleTipoChange(key as CardTipo | '')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Domain filter */}
      {showDomainFilter && (
        <div className="filter-row">
          {DOMAIN_KEYS.map(key => (
            <button
              key={key}
              className={`pill pill-dom pill-dom-${key} ${dominioKey === key ? 'active' : ''}`}
              onClick={() => setDominioKey(dominioKey === key ? '' : key)}
            >
              {DOMAIN_LABELS[key]}
            </button>
          ))}
        </div>
      )}

      {/* Card tipo filter (domínios) */}
      {showCardTipoFilter && (
        <div className="filter-row">
          {CARD_TIPO_LABELS.map(ct => (
            <button
              key={ct}
              className={`pill ${cardTipo === ct ? 'active' : ''}`}
              onClick={() => setCardTipo(cardTipo === ct ? '' : ct)}
            >
              {ct}
            </button>
          ))}
        </div>
      )}

      {/* Classe filter (subclasses) */}
      {showClasseFilter && (
        <div className="filter-row">
          {CLASS_KEYS.map(key => (
            <button
              key={key}
              className={`pill ${classe === key ? 'active' : ''}`}
              onClick={() => setClasse(classe === key ? '' : key)}
            >
              {CLASS_LABELS[key]}
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      <div className="cards-count">
        {loading
          ? 'Carregando...'
          : `${cards.length} carta${cards.length !== 1 ? 's' : ''} encontrada${cards.length !== 1 ? 's' : ''}`
        }
      </div>

      {/* Empty state */}
      {!loading && cards.length === 0 && (
        <div className="empty-state">
          <h3>Nenhuma carta encontrada</h3>
          {hasFilters ? (
            <p>Tente ajustar os filtros de busca.</p>
          ) : (
            <>
              <p>O banco de dados ainda não possui cartas.</p>
            </>
          )}
        </div>
      )}

      {/* Cards grid */}
      {!loading && cards.length > 0 && (
        <div className="cards-grid">
          {cards.map(card => (
            <CardItem key={card.id} card={card} onClick={() => setSelected(card)} />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <CardModal card={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
