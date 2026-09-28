import { useEffect, useState } from 'react'

// <model-viewer> (y three.js) solo se descargan la primera vez que alguien pulsa "Ver en 3D".
let modelViewerListo = null
function cargarModelViewer() {
  if (!modelViewerListo) modelViewerListo = import('@google/model-viewer')
  return modelViewerListo
}

const Visor = ({ tipo, plato, indice = 0, onClose }) => {
  const [listo, setListo] = useState(tipo !== '3d')
  const [fallo, setFallo] = useState(false)
  const [i, setI] = useState(indice)
  const fotos = plato.images || []

  useEffect(() => {
    if (tipo !== '3d') return
    let vivo = true
    cargarModelViewer()
      .then(() => vivo && setListo(true))
      .catch(() => vivo && setFallo(true))
    return () => { vivo = false }
  }, [tipo])

  const poster = plato.model_3d?.preview_url || fotos[0]?.url

  return (
    <div className="cm-visor" role="dialog" aria-modal="true" aria-label={`${plato.name}${tipo === '3d' ? ' en 3D' : ''}`}>
      <div className="cm-visor-backdrop" onClick={onClose} />
      <div className="cm-visor-caja">
        <button type="button" className="cm-cerrar cm-visor-cerrar" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>

        <div className="cm-visor-medio">
          {tipo === '3d' && fallo && <p className="cm-visor-msg">No se pudo cargar el modelo 3D.</p>}
          {tipo === '3d' && !fallo && !listo && <p className="cm-visor-msg">Cargando 3D…</p>}
          {tipo === '3d' && listo && !fallo && (
            <model-viewer
              src={plato.model_3d.glb_url}
              poster={poster || undefined}
              alt={`Modelo 3D de ${plato.name}`}
              camera-controls=""
              auto-rotate=""
              touch-action="pan-y"
              shadow-intensity="1"
              exposure="1"
              ar=""
              ar-modes="webxr scene-viewer quick-look"
              interaction-prompt="auto"
              loading="eager"
              style={{ width: '100%', height: '100%', background: 'transparent' }}
              onError={() => setFallo(true)}
            />
          )}

          {tipo === 'foto' && fotos[i] && (
            <img className="cm-visor-img" src={fotos[i].url} alt={plato.name} />
          )}
          {tipo === 'foto' && fotos.length > 1 && (
            <>
              <button type="button" className="cm-visor-nav cm-visor-prev" aria-label="Foto anterior"
                onClick={() => setI((i - 1 + fotos.length) % fotos.length)}>‹</button>
              <button type="button" className="cm-visor-nav cm-visor-next" aria-label="Foto siguiente"
                onClick={() => setI((i + 1) % fotos.length)}>›</button>
            </>
          )}
        </div>

        <div className="cm-visor-info">
          <h3>{plato.name}</h3>
          {plato.price_text && <span className="cm-plato-precio">{plato.price_text}</span>}
          {tipo === '3d' && <p className="cm-visor-ayuda">Arrastra para girar · pellizca para acercar</p>}
        </div>
      </div>
    </div>
  )
}

export default Visor
