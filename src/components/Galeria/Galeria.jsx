import { useState, useEffect } from 'react'
import ScrollReveal from '../ScrollReveal/ScrollReveal'
import './Galeria.css'

// Imágenes sala
import fotoSala from '../../img/foto_sala.png'
import fotoSofa from '../../img/foto_sofa.png'
import fotoPlatos from '../../img/foto_platos.png'
import fotoMaquinaCerveza from '../../img/foto_maquina_cerveza.png'

// Imágenes especialidades
import pulpo from '../../img/pulpo.png'
import fotoCarne from '../../img/foto_carne.png'
import fotoVinos from '../../img/foto_vinos.jpg'
import fotoCocteles from '../../img/foto_cocteles.png'

const Carrusel = ({ slides, title, interval = 4000, altPrefix, className = '' }) => {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, interval)
    return () => clearInterval(timer)
  }, [slides.length, interval])

  return (
    <section className={`galeria-section ${className}`}>
      <ScrollReveal animation="fade-up">
        <h2>{title}</h2>
      </ScrollReveal>
      <ScrollReveal animation="fade-up" delay={0.2}>
        <div className="carrusel">
          <div className="carrusel-container" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
            {slides.map((img, idx) => (
              <div key={idx} className="carrusel-slide">
                <img src={img} alt={`${altPrefix} ${idx + 1}`} />
              </div>
            ))}
          </div>
          <div className="carrusel-dots">
            {slides.map((_, idx) => (
              <span 
                key={idx} 
                className={`dot ${currentSlide === idx ? 'active' : ''}`}
                onClick={() => setCurrentSlide(idx)}
              ></span>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  )
}

const Galeria = () => {
  const salaSlides = [fotoSala, fotoSofa, fotoPlatos, fotoMaquinaCerveza]
  const especialidadesSlides = [pulpo, fotoCarne, fotoVinos, fotoCocteles]

  return (
    <div id="galeria">
      <Carrusel 
        slides={salaSlides} 
        title="Nuestro Espacio" 
        interval={5000} 
        altPrefix="Espacio" 
        className="alt"
      />
      <Carrusel 
        slides={especialidadesSlides} 
        title="Nuestras Especialidades" 
        interval={4500} 
        altPrefix="Especialidad" 
      />
    </div>
  )
}

export default Galeria
