import { useState } from 'react'
import CartaCarousel from './CartaCarousel'
import ScrollReveal from '../ScrollReveal/ScrollReveal'
import './Carta.css'

import fotoPlatos from '../../img/foto_platos.png'

const Carta = () => {
  const [carouselOpen, setCarouselOpen] = useState(false)

  return (
    <>
      <section id="carta" className="carta-section">
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
              <button onClick={() => setCarouselOpen(true)} className="carta-btn">
                Ver carta
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <CartaCarousel isOpen={carouselOpen} onClose={() => setCarouselOpen(false)} />
    </>
  )
}

export default Carta
