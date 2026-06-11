import { useState, useEffect, useMemo } from 'react'
import { api } from '../api'
import CollapsibleSection from '../components/CollapsibleSection'
import {
  Card, CardTipo, DomainKey, TipoCartaDominio,
  DOMAIN_LABELS, DOMAIN_KEYS, CLASS_LABELS, CLASS_KEYS, CARD_TIPO_LABELS,
} from '../types/cards'

const PAGE_SIZE = 24

const TIPO_LABELS: Record<CardTipo, string> = {
  subclasse: 'Subclasse',
  dominio: 'Domínio',
  ancestralidade: 'Ancestralidade',
  comunidade: 'Comunidade',
}

function toggle<T>(set: Set<T>, item: T): Set<T> {
  const next = new Set(set)
  if (next.has(item)) next.delete(item)
  else next.add(item)
  return next
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CardTags({ card }: { card: Card }) {
  return (
    <>
      {card.tipo === 'dominio' && card.dominio_key && (
        <span className={`card-tag card-tag-dom card-tag-dom-${card.dominio_key}`}>
          {DOMAIN_LABELS[card.dominio_key as DomainKey]}
        </span>
      )}
      {card.tipo === 'subclasse' && (
        <>
          <span className="card-tag card-tag-cls">{card.nome_classe}</span>
          {card.dominio_key && (
            <span className={`card-tag card-tag-dom card-tag-dom-${card.dominio_key}`}>
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

interface CardModalProps {
  card: Card
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev: boolean
  hasNext: boolean
  position: { current: number; total: number }
}

function CardModal({ card, onClose, onPrev, onNext, hasPrev, hasNext, position }: CardModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.()
      if (e.key === 'ArrowRight' && hasNext) onNext?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext, hasPrev, hasNext])

  return (
    <div className="modal-ov" onClick={onClose}>
      <div className="card-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="card-modal-hdr">
          <div className="card-modal-hdr-tags">
            <CardTags card={card} />
          </div>
          <div className="card-modal-hdr-right">
            <span className="card-modal-num">#{String(card.num).padStart(3, '0')}</span>
            <button className="btn btn-ghost btn-sm card-modal-close" onClick={onClose}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="card-modal-name"><CardTitle card={card} /></div>

        {/* Meta */}
        {(card.atributo_conjuracao || card.custo != null) && (
          <div className="card-modal-meta">
            {card.atributo_conjuracao && (
              <span className="card-modal-meta-item">
                <span className="card-modal-meta-lbl">Conjuração</span>
                <strong>{card.atributo_conjuracao}</strong>
              </span>
            )}
            {card.custo != null && (
              <span className="card-modal-meta-item">
                <span className="card-modal-meta-lbl">Custo de Troca</span>
                <strong>{card.custo === 0 ? '—' : `${card.custo} PF`}</strong>
              </span>
            )}
          </div>
        )}

        {/* Description */}
        <div className="card-modal-desc">{card.descricao}</div>

        {/* Navigation */}
        <div className="card-modal-nav">
          <button
            className="btn btn-ghost btn-sm card-modal-nav-btn"
            onClick={onPrev}
            disabled={!hasPrev}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
            Anterior
          </button>
          <span className="card-modal-nav-pos">{position.current} / {position.total}</span>
          <button
            className="btn btn-ghost btn-sm card-modal-nav-btn"
            onClick={onNext}
            disabled={!hasNext}
          >
            Próxima
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CardsScreen() {
  const [allCards, setAllCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const [tipos, setTipos] = useState<Set<CardTipo>>(new Set())
  const [dominioKeys, setDominioKeys] = useState<Set<DomainKey>>(new Set())
  const [cardTipos, setCardTipos] = useState<Set<TipoCartaDominio>>(new Set())
  const [classes, setClasses] = useState<Set<string>>(new Set())
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 350)
    return () => clearTimeout(t)
  }, [qInput])

  useEffect(() => {
    setLoading(true)
    api.cards.getAll({ q: q || undefined })
      .then(setAllCards)
      .catch(() => setAllCards([]))
      .finally(() => setLoading(false))
  }, [q])

  useEffect(() => { setPage(1) }, [tipos, dominioKeys, cardTipos, classes, q])

  const filtered = useMemo(() => {
    return allCards.filter(card => {
      if (tipos.size > 0 && !tipos.has(card.tipo)) return false
      if (dominioKeys.size > 0 && (!card.dominio_key || !dominioKeys.has(card.dominio_key as DomainKey))) return false
      if (cardTipos.size > 0 && (!card.card_tipo || !cardTipos.has(card.card_tipo))) return false
      if (classes.size > 0 && (!card.classe || !classes.has(card.classe))) return false
      return true
    })
  }, [allCards, tipos, dominioKeys, cardTipos, classes])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageCards = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const showDomainFilter = tipos.size === 0 || tipos.has('subclasse') || tipos.has('dominio')
  const showCardTipoFilter = tipos.size === 0 || tipos.has('dominio')
  const showClasseFilter = tipos.size === 0 || tipos.has('subclasse')

  const hasFilters = tipos.size > 0 || dominioKeys.size > 0 || cardTipos.size > 0 || classes.size > 0 || !!q

  function clearFilters() {
    setTipos(new Set())
    setDominioKeys(new Set())
    setCardTipos(new Set())
    setClasses(new Set())
    setQInput('')
  }

  return (
    <div className="cards-wrap">
      {/* Header */}
      <div className="cards-header">
        <div className="cards-header-left">
          <span className="material-symbols-outlined" style={{ color: 'var(--accent)', fontSize: 20 }}>auto_stories</span>
          <h2 className="cards-title">Grimório</h2>
          {!loading && (
            <span className="cards-count-badge">{filtered.length} carta{filtered.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="cards-search-wrap">
          <span className="material-symbols-outlined cards-search-icon">search</span>
          <input
            className="cards-search"
            placeholder="Buscar por nome ou descrição..."
            value={qInput}
            onChange={e => setQInput(e.target.value)}
          />
          {qInput && (
            <button className="cards-search-clear" onClick={() => setQInput('')} title="Limpar busca">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <CollapsibleSection
        title="Filtros"
        icon="filter_list"
        defaultOpen={true}
        headerRight={hasFilters ? (
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '.7rem', padding: '3px 8px' }}
            onClick={clearFilters}
          >
            Limpar filtros
          </button>
        ) : undefined}
      >
        <div className="cards-filter-group">
          <span className="cards-filter-group-lbl">Tipo de Carta</span>
          <div className="filter-row">
            {(['subclasse', 'dominio', 'ancestralidade', 'comunidade'] as CardTipo[]).map(t => (
              <button
                key={t}
                className={`pill${tipos.has(t) ? ' active' : ''}`}
                onClick={() => setTipos(prev => toggle(prev, t))}
              >
                {TIPO_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {showDomainFilter && (
          <div className="cards-filter-group">
            <span className="cards-filter-group-lbl">Domínio</span>
            <div className="filter-row">
              {DOMAIN_KEYS.map(key => (
                <button
                  key={key}
                  className={`pill pill-dom pill-dom-${key}${dominioKeys.has(key) ? ' active' : ''}`}
                  onClick={() => setDominioKeys(prev => toggle(prev, key))}
                >
                  {DOMAIN_LABELS[key]}
                </button>
              ))}
            </div>
          </div>
        )}

        {showCardTipoFilter && (
          <div className="cards-filter-group">
            <span className="cards-filter-group-lbl">Tipo de Carta de Domínio</span>
            <div className="filter-row">
              {CARD_TIPO_LABELS.map(ct => (
                <button
                  key={ct}
                  className={`pill${cardTipos.has(ct) ? ' active' : ''}`}
                  onClick={() => setCardTipos(prev => toggle(prev, ct))}
                >
                  {ct}
                </button>
              ))}
            </div>
          </div>
        )}

        {showClasseFilter && (
          <div className="cards-filter-group">
            <span className="cards-filter-group-lbl">Classe</span>
            <div className="filter-row">
              {CLASS_KEYS.map(key => (
                <button
                  key={key}
                  className={`pill${classes.has(key) ? ' active' : ''}`}
                  onClick={() => setClasses(prev => toggle(prev, key))}
                >
                  {CLASS_LABELS[key]}
                </button>
              ))}
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Loading */}
      {loading && (
        <p style={{ color: 'var(--text-dim)', fontSize: '.85rem', padding: '16px 0' }}>Carregando cartas…</p>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <h3>Nenhuma carta encontrada</h3>
          <p>{hasFilters ? 'Tente ajustar os filtros de busca.' : 'O banco de dados ainda não possui cartas.'}</p>
        </div>
      )}

      {/* Grid */}
      {!loading && pageCards.length > 0 && (
        <div className="cards-grid">
          {pageCards.map((card, i) => {
            const globalIndex = (page - 1) * PAGE_SIZE + i
            return (
              <CardItem key={card.id} card={card} onClick={() => setSelectedIndex(globalIndex)} />
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="cards-pagination">
          <button
            className="btn btn-ghost btn-sm"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
            Anterior
          </button>
          <span className="cards-pagination-info">
            <strong>{page}</strong>
            <span style={{ color: 'var(--text-dim)' }}> / {totalPages}</span>
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Próxima
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
          </button>
        </div>
      )}

      {selectedIndex !== null && filtered[selectedIndex] && (
        <CardModal
          card={filtered[selectedIndex]}
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex < filtered.length - 1}
          position={{ current: selectedIndex + 1, total: filtered.length }}
          onClose={() => setSelectedIndex(null)}
          onPrev={() => setSelectedIndex(i => i !== null ? Math.max(0, i - 1) : null)}
          onNext={() => setSelectedIndex(i => i !== null ? Math.min(filtered.length - 1, i + 1) : null)}
        />
      )}
    </div>
  )
}
