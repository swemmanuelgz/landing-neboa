import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Visor from './Visor'
import './CartaModal.css'

const TELEFONO = '988 664 795'

// Nombres bonitos de los 14 alergenos UE; si llega otro, se muestra tal cual.
const ALERGENOS = {
  gluten: 'Gluten',
  crustaceos: 'Crustáceos',
  huevo: 'Huevo',
  huevos: 'Huevo',
  pescado: 'Pescado',
  cacahuete: 'Cacahuetes',
  cacahuetes: 'Cacahuetes',
  soja: 'Soja',
  leche: 'Lácteos',
  lacteos: 'Lácteos',
  frutos_de_cascara: 'Frutos de cáscara',
  frutos_cascara: 'Frutos de cáscara',
  apio: 'Apio',
  mostaza: 'Mostaza',
  sesamo: 'Sésamo',
  sulfitos: 'Sulfitos',
  altramuces: 'Altramuces',
  moluscos: 'Moluscos',
}

const sinAcentos = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
function nombreAlergeno(a) {
  const clave = sinAcentos(String(a).trim().toLowerCase()).replace(/[\s-]+/g, '_')
  if (ALERGENOS[clave]) return ALERGENOS[clave]
  const t = String(a).replace(/_/g, ' ').trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

// Las cartas suelen venir en MAYUSCULAS: se pasan a tipo titulo.
function tituloBonito(s) {
  if (!s) return ''
  if (s !== s.toUpperCase()) return s
  const minus = new Set(['de', 'del', 'la', 'el', 'y', 'con', 'a', 'al', 'en'])
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && minus.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
    .replace(/\bNeboa\b/i, 'Néboa')
}

function fechaCorta(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' })
}

const Plato = ({ plato, onVer }) => {
  const foto = plato.images?.[0]?.url
  const masFotos = (plato.images?.length || 0) - 1
  return (
    <li className={`cm-plato ${foto ? 'cm-plato--foto' : ''}`}>
      {foto && (
        <button
          type="button"
          className="cm-plato-foto"
          onClick={() => onVer({ tipo: 'foto', plato, indice: 0 })}
          aria-label={`Ver foto de ${plato.name}`}
        >
          <img src={foto} alt="" loading="lazy" decoding="async" />
          {masFotos > 0 && <span className="cm-plato-foto-mas">+{masFotos}</span>}
        </button>
      )}
      <div className="cm-plato-cuerpo">
        <div className="cm-plato-linea">
          <h4 className="cm-plato-nombre">{plato.name}</h4>
          {plato.price_text && <span className="cm-plato-precio">{plato.price_text}</span>}
        </div>
        {plato.description && <p className="cm-plato-desc">{plato.description}</p>}
        {(plato.allergens?.length > 0 || plato.model_3d) && (
          <div className="cm-plato-pie">
            {plato.allergens?.length > 0 && (
              <ul className="cm-alergenos" aria-label="Alérgenos">
                {plato.allergens.map((a) => (
                  <li key={a} className="cm-alergeno">{nombreAlergeno(a)}</li>
                ))}
              </ul>
            )}
            {plato.model_3d?.glb_url && (
              <button
                type="button"
                className="cm-btn-3d"
                onClick={() => onVer({ tipo: '3d', plato })}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
                    d="M12 2.8 20 7.3v9.4l-8 4.5-8-4.5V7.3l8-4.5Zm0 0v9.2m0 0 8-4.7M12 12l-8-4.7M12 12v9.2" />
                </svg>
                Ver en 3D
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

const Carta = ({ carta, onVer, scrollRef }) => {
  const secciones = (carta.secciones || []).filter((s) => s.platos?.length)
  const [activa, setActiva] = useState(0)
  const refs = useRef([])

  // Resalta en la barra la seccion que se esta leyendo.
  useEffect(() => {
    const root = scrollRef.current
    if (!root || secciones.length < 2) return
    const obs = new IntersectionObserver(
      (entries) => {
        const visibles = entries.filter((e) => e.isIntersecting)
        if (!visibles.length) return
        visibles.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        setActiva(Number(visibles[0].target.dataset.idx))
      },
      { root, rootMargin: '-120px 0px -55% 0px' }
    )
    refs.current.forEach((el) => el && obs.observe(el))
    return () => obs.disconnect()
  }, [carta, secciones.length, scrollRef])

  const irA = (idx) => {
    setActiva(idx)
    const root = scrollRef.current
    const el = refs.current[idx]
    if (!root || !el) return
    const barra = root.querySelector('.cm-secciones')?.offsetHeight || 0
    const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - barra
    root.scrollTo({ top, behavior: 'smooth' })
  }

  if (!secciones.length) {
    return <p className="cm-vacio">Estamos actualizando la carta. Pregúntanos por los platos de hoy.</p>
  }

  return (
    <>
      {secciones.length > 1 && (
        <nav className="cm-secciones" aria-label="Secciones de la carta">
          {secciones.map((s, i) => (
            <button
              key={s.id || s.name}
              type="button"
              className={`cm-seccion-chip ${i === activa ? 'is-active' : ''}`}
              aria-current={i === activa ? 'true' : undefined}
              onClick={() => irA(i)}
            >
              {tituloBonito(s.name)}
            </button>
          ))}
        </nav>
      )}

      {carta.kind === 'menu_dia' && (
        <p className="cm-menu-fecha">
          {fechaCorta(carta.valid_from) ? `Menú del ${fechaCorta(carta.valid_from)}` : 'Menú del día'}
          {carta.origen === 'por_defecto' && ' · consulta disponibilidad'}
        </p>
      )}

      {secciones.map((s, i) => (
        <section
          key={s.id || s.name}
          className="cm-seccion"
          data-idx={i}
          ref={(el) => { refs.current[i] = el }}
        >
          <h3 className="cm-seccion-titulo">{tituloBonito(s.name)}</h3>
          {s.description && <p className="cm-seccion-desc">{s.description}</p>}
          <ul className="cm-platos">
            {s.platos.map((p) => (
              <Plato key={p.id} plato={p} onVer={onVer} />
            ))}
          </ul>
        </section>
      ))}

      {carta.pdf_url && (
        <p className="cm-pdf">
          <a href={carta.pdf_url} target="_blank" rel="noopener noreferrer">Descargar la carta en PDF</a>
        </p>
      )}
    </>
  )
}

const CartaModal = ({ isOpen, inicio, onClose, estado, data, onRetry }) => {
  const scrollRef = useRef(null)
  const cerrarRef = useRef(null)
  const [visor, setVisor] = useState(null)
  const [pestana, setPestana] = useState(0)

  const pestanas = useMemo(() => {
    if (!data) return []
    const lista = (data.cartas || []).map((c) => ({ id: c.id, label: tituloBonito(c.name), carta: c }))
    if (data.menu_del_dia) lista.push({ id: 'menu-dia', label: 'Menú del día', carta: data.menu_del_dia })
    return lista
  }, [data])

  // Al abrir: primera carta, o el menu del dia si se pidio.
  useEffect(() => {
    if (!isOpen) return
    const idx = inicio === 'menu' ? pestanas.findIndex((p) => p.id === 'menu-dia') : 0
    setPestana(Math.max(idx, 0))
    // Solo al abrir; si luego llegan datos nuevos no se cambia la pestana.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, inicio])

  const actual = pestanas[Math.min(pestana, Math.max(pestanas.length - 1, 0))]

  const cerrar = useCallback(() => {
    setVisor(null)
    onClose()
  }, [onClose])

  // Teclado + bloqueo del scroll de la pagina.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (visor) setVisor(null)
      else cerrar()
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [isOpen, visor, cerrar])

  useEffect(() => {
    if (isOpen) cerrarRef.current?.focus()
  }, [isOpen])

  const cambiarPestana = (i) => {
    setPestana(i)
    scrollRef.current?.scrollTo({ top: 0 })
  }

  if (!isOpen) return null

  // Portal a <body>: un ancestro con transform (ScrollReveal) romperia position:fixed.
  return createPortal(
    <div className="cm-modal" role="dialog" aria-modal="true" aria-labelledby="cm-titulo">
      <div className="cm-backdrop" onClick={cerrar} />
      <div className="cm-panel">
        <header className="cm-header">
          <h2 id="cm-titulo" className="cm-titulo">Nuestra Carta</h2>
          <button ref={cerrarRef} type="button" className="cm-cerrar" onClick={cerrar} aria-label="Cerrar carta">
            ✕
          </button>
          {pestanas.length > 1 && (
            <div className="cm-pestanas" role="tablist" aria-label="Cartas">
              {pestanas.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={p === actual}
                  className={`cm-pestana ${p === actual ? 'is-active' : ''}`}
                  onClick={() => cambiarPestana(i)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </header>

        <div className="cm-scroll" ref={scrollRef}>
          {(estado === 'loading' || estado === 'idle') && !data && (
            <div className="cm-cargando" aria-busy="true" aria-label="Cargando carta">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="cm-skel">
                  <span className="cm-skel-l cm-skel-l--titulo" />
                  <span className="cm-skel-l" />
                </div>
              ))}
            </div>
          )}

          {estado === 'error' && !data && (
            <div className="cm-error" role="alert">
              <p>No hemos podido cargar la carta ahora mismo.</p>
              <button type="button" className="carta-btn" onClick={onRetry}>Reintentar</button>
              <p className="cm-error-tel">
                También puedes llamarnos al <a href={`tel:+34${TELEFONO.replace(/\s/g, '')}`}>{TELEFONO}</a>.
              </p>
            </div>
          )}

          {data && !actual && (
            <p className="cm-vacio">Estamos actualizando la carta. Pregúntanos por los platos de hoy.</p>
          )}

          {data && actual && (
            <Carta key={actual.id} carta={actual.carta} onVer={setVisor} scrollRef={scrollRef} />
          )}

          {data && (
            <p className="cm-aviso">
              Si tienes alguna alergia o intolerancia, avísanos: nuestro equipo te informará de los
              alérgenos de cada plato.
            </p>
          )}
        </div>
      </div>

      {visor && <Visor {...visor} onClose={() => setVisor(null)} />}
    </div>,
    document.body
  )
}

export default CartaModal
