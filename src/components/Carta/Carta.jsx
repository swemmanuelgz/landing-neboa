import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import CartaModal from './CartaModal'
import useCarta from './useCarta'
import ScrollReveal from '../ScrollReveal/ScrollReveal'
import './Carta.css'

import fotoPlatos from '../../img/foto_platos.png'

const Carta = () => {
  const [abierta, setAbierta] = useState(false)
  const carta = useCarta()
  const { cargar } = carta

  // Se pide la carta cuando la seccion se acerca a la pantalla,
  // asi el modal abre ya con los datos.
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: '400px 0px' })
  useEffect(() => {
    if (inView) cargar()
  }, [inView, cargar])

  const [inicio, setInicio] = useState(null)
  const abrir = (en = null) => {
    cargar()
    setInicio(en)
    setAbierta(true)
  }

  return (
    <>
      <section id="carta" className="carta-section" ref={ref}>
        <ScrollReveal animation="fade-up" delay={0}>
          <h2>Nuestra Carta</h2>
        </ScrollReveal>
        <div className="carta-grid carta-grid--single">
          <ScrollReveal animation="zoom-in" duration={0.5}>
            <div className="carta-item">
              <div className="carta-header">NUESTRA CARTA</div>
              <div
                className="carta-image"
                style={{ backgroundImage: `url(${fotoPlatos})` }}
              ></div>
              <button onClick={() => abrir()} className="carta-btn" type="button">
                Ver carta
              </button>
              {carta.data?.menu_del_dia && (
                <button onClick={() => abrir('menu')} className="carta-menu-dia-link" type="button">
                  Hoy tenemos menú del día
                </button>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <CartaModal
        isOpen={abierta}
        inicio={inicio}
        onClose={() => setAbierta(false)}
        estado={carta.estado}
        data={carta.data}
        onRetry={() => carta.cargar(true)}
      />
    </>
  )
}

export default Carta
