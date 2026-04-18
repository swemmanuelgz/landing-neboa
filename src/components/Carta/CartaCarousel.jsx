import { useState, useEffect, useRef } from 'react'
import './CartaCarousel.css'

// Imágenes de la nueva carta
import alergenosImg from './nueva_carta/img/alérgenos.png'
import entrantesImg from './nueva_carta/img/entrantes.png'
import platosImg from './nueva_carta/img/platos_principales.png'
import postersImg from './nueva_carta/img/para_terminar.png'

const slides = [
  { id: 'alergenos', label: 'Alérgenos', image: alergenosImg, alt: 'Información de alérgenos' },
  { id: 'entrantes', label: 'Entrantes', image: entrantesImg, alt: 'Sección de entrantes' },
  { id: 'platos', label: 'Platos principales', image: platosImg, alt: 'Sección de platos principales' },
  { id: 'postre', label: 'Para terminar', image: postersImg, alt: 'Sección de postres y bebidas' },
]

const CartaCarousel = ({ isOpen, onClose }) => {
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, current])

  const next = () => setCurrent((prev) => (prev + 1) % slides.length)
  const prev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)
  const goToSlide = (idx) => setCurrent(idx)

  // Touch swipe
  const handleTouchStart = (e) => { touchStartX.current = e.changedTouches[0].screenX }
  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].screenX
    if (touchStartX.current - touchEndX.current > 50) next()
    if (touchEndX.current - touchStartX.current > 50) prev()
  }

  if (!isOpen) return null

  return (
    <div className="carousel-modal" role="dialog" aria-modal="true" aria-label="Carrusel de carta">
      {/* Backdrop */}
      <div className="carousel-backdrop" onClick={onClose} aria-label="Cerrar carrusel" />

      {/* Container */}
      <div className="carousel-container">
        {/* Close button */}
        <button
          className="carousel-close"
          onClick={onClose}
          aria-label="Cerrar carrusel"
          type="button"
        >
          ✕
        </button>

        {/* Slides */}
        <div
          className="carousel-slides"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              className={`carousel-slide ${idx === current ? 'active' : ''}`}
              role="tabpanel"
              aria-label={slide.alt}
              aria-hidden={idx !== current}
            >
              <img
                src={slide.image}
                alt={slide.alt}
                loading={idx === current ? 'eager' : 'lazy'}
                decoding="async"
              />
            </div>
          ))}
        </div>

        {/* Navigation buttons */}
        <button
          className="carousel-nav carousel-prev"
          onClick={prev}
          aria-label="Anterior"
          type="button"
        >
          ‹
        </button>
        <button
          className="carousel-nav carousel-next"
          onClick={next}
          aria-label="Siguiente"
          type="button"
        >
          ›
        </button>

        {/* Slide indicators */}
        <div className="carousel-indicators" role="tablist" aria-label="Indicadores de diapositiva">
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              className={`indicator ${idx === current ? 'active' : ''}`}
              onClick={() => goToSlide(idx)}
              role="tab"
              aria-label={`Ir a ${slide.label}`}
              aria-selected={idx === current}
              type="button"
            />
          ))}
        </div>

        {/* Counter and title */}
        <div className="carousel-info">
          <h3>{slides[current].label}</h3>
          <span className="carousel-counter">
            {current + 1} / {slides.length}
          </span>
        </div>
      </div>
    </div>
  )
}

export default CartaCarousel
