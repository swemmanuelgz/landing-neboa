import { useState, useEffect } from 'react'
import './App.css'

// Importar imágenes
import logo from './img/logo_neboa.jpg'
import neboaProfile from './img/neboa_profile.png'
import fotoDesayuno from './img/foto_desayuno.jpg'
import fotoDesayuno2 from './img/foto_desayuno2.png'
import fotoDesayuno3 from './img/foto_desayuno3.png'
import fotoDesayuno4 from './img/foto_desayuno4.png'
import fotoDesayuno5 from './img/foto_desayuno5.png'
import fotoSala from './img/foto_sala.png'
import fotoSofa from './img/foto_sofa.png'
import fotoPlatos from './img/foto_platos.png'
import fotoCarne from './img/foto_carne.png'
import pulpo from './img/pulpo.png'
import fotoVinos from './img/foto_vinos.jpg'
import fotoCocteles from './img/foto_cocteles.png'
import fotoMaquinaCerveza from './img/foto_maquina_cerveza.png'

// Importar PDFs
import cartaDesayunos from './img/carta_desayunos.pdf'
import cartaPrincipal from './img/carta_principal.pdf'
import cartaTapeo from './img/carta_tapeo.pdf'
import cartaVinos from './img/carta_vinos.pdf'
import cartaCocteleria from './img/carta_cocteleria.pdf'

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentSlide2, setCurrentSlide2] = useState(0)
  const [currentSlide3, setCurrentSlide3] = useState(0)
  
  // Modal de PDF
  const [pdfModal, setPdfModal] = useState({ isOpen: false, pdfUrl: '', title: '' })
  
  // Formulario de reservas
  const [reserva, setReserva] = useState({
    nombre: '',
    telefono: '',
    fecha: '',
    hora: '',
    personas: ''
  })
  const [mensajeReserva, setMensajeReserva] = useState('')

  // Carruseles
  const desayunosSlides = [fotoDesayuno, fotoDesayuno2, fotoDesayuno3, fotoDesayuno4, fotoDesayuno5]
  const salaSlides = [fotoSala, fotoSofa, fotoPlatos, fotoMaquinaCerveza]
  const especialidadesSlides = [pulpo, fotoCarne, fotoVinos, fotoCocteles]

  // Auto-rotate carruseles
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % desayunosSlides.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide2((prev) => (prev + 1) % salaSlides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide3((prev) => (prev + 1) % especialidadesSlides.length)
    }, 4500)
    return () => clearInterval(interval)
  }, [])

  // Obtener fecha mínima (mañana)
  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  // Obtener día de la semana
  const getDayOfWeek = (dateString) => {
    const date = new Date(dateString)
    return date.getDay() // 0 = Domingo, 1 = Lunes, etc.
  }

  // Horarios disponibles según el día
  const getAvailableHours = (dateString) => {
    if (!dateString) return []
    const day = getDayOfWeek(dateString)
    
    // Horarios basados en horario.pdf
    const horarios = {
      0: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00'], // Domingo - solo comidas
      1: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00'], // Lunes
      2: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00'], // Martes
      3: [], // Miércoles cerrado
      4: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00'], // Jueves
      5: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00'], // Viernes
      6: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00'] // Sábado
    }
    
    return horarios[day] || []
  }

  const handleReservaChange = (e) => {
    const { name, value } = e.target
    setReserva(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'fecha' ? { hora: '' } : {})
    }))
  }

  const handleReservaSubmit = (e) => {
    e.preventDefault()
    
    const day = getDayOfWeek(reserva.fecha)
    if (day === 3) {
      setMensajeReserva('❌ Lo sentimos, los miércoles estamos cerrados.')
      return
    }
    
    // Crear mensaje de WhatsApp
    const mensaje = `🍽️ *Nueva Reserva - Néboa*%0A%0A👤 Nombre: ${reserva.nombre}%0A📞 Teléfono: ${reserva.telefono}%0A📅 Fecha: ${reserva.fecha}%0A🕐 Hora: ${reserva.hora}%0A👥 Personas: ${reserva.personas}`
    
    window.open(`https://wa.me/34630713713?text=${mensaje}`, '_blank')
    setMensajeReserva('✅ Redirigiendo a WhatsApp para confirmar tu reserva...')
    
    // Reset form
    setTimeout(() => {
      setReserva({ nombre: '', telefono: '', fecha: '', hora: '', personas: '' })
      setMensajeReserva('')
    }, 3000)
  }

  const closeMenu = () => setMenuOpen(false)

  // Abrir PDF en modal
  const openPdfModal = (pdfUrl, title) => {
    setPdfModal({ isOpen: true, pdfUrl, title })
  }

  // Cerrar modal de PDF
  const closePdfModal = () => {
    setPdfModal({ isOpen: false, pdfUrl: '', title: '' })
  }

  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <img src={logo} alt="Néboa Restaurante" />
            <span>Néboa Restaurante</span>
          </div>
          <div className={`nav-menu ${menuOpen ? 'active' : ''}`}>
            <a href="#inicio" className="nav-link" onClick={closeMenu}>Inicio</a>
            <a href="#carta" className="nav-link" onClick={closeMenu}>Carta</a>
            <a href="#galeria" className="nav-link" onClick={closeMenu}>Galería</a>
            <a href="#reservas" className="nav-link" onClick={closeMenu}>Reservas</a>
            <a href="#nosotros" className="nav-link" onClick={closeMenu}>Nosotros</a>
            <a href="#contacto" className="nav-link" onClick={closeMenu}>Contacto</a>
          </div>
          <div className="nav-social">
            <a href="https://www.instagram.com/restauranteneboaourense/" target="_blank" rel="noopener noreferrer" className="social-icon">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href="https://wa.me/34630713713" target="_blank" rel="noopener noreferrer" className="social-icon whatsapp">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
          </div>
          <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="inicio" className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <img src={logo} alt="Néboa" className="hero-logo" />
          <p className="hero-subtitle">– OURENSE –</p>
        </div>
      </section>

      {/* Bienvenida */}
      <section className="bienvenida">
        <h2>Bienvenidos a nuestro restaurante</h2>
        <p>
          Ubicado en Ourense, el centro de la capital de las termas, nace en 2025 con el objetivo de ofrecer a nuestros 
          clientes una gastronomía tradicional de calidad dándole la vuelta a las presentaciones ofreciendo una 
          <em> experiencia para los cinco sentidos.</em>
        </p>
        <a href="#reservas" className="btn-reserva">
          HAZ TU RESERVA
          <span className="arrow">▲</span>
        </a>
      </section>

      {/* Carta Section */}
      <section id="carta" className="carta-section">
        <h2>Nuestras Cartas</h2>
        <div className="carta-grid">
          <div className="carta-item">
            <div className="carta-header">NUESTROS DESAYUNOS</div>
            <div className="carta-image" style={{ backgroundImage: `url(${fotoDesayuno})` }}></div>
            <button onClick={() => openPdfModal(cartaDesayunos, 'Carta de Desayunos')} className="carta-btn">
              Carta de desayunos
            </button>
          </div>
          <div className="carta-item">
            <div className="carta-header">NUESTRA CARTA</div>
            <div className="carta-image" style={{ backgroundImage: `url(${fotoPlatos})` }}></div>
            <button onClick={() => openPdfModal(cartaPrincipal, 'Carta Principal')} className="carta-btn">
              Carta principal
            </button>
          </div>
          <div className="carta-item">
            <div className="carta-header">NUESTRAS TAPAS</div>
            <div className="carta-image" style={{ backgroundImage: `url(${pulpo})` }}></div>
            <button onClick={() => openPdfModal(cartaTapeo, 'Carta de Tapeo')} className="carta-btn">
              Carta de tapeo
            </button>
          </div>
        </div>
        <div className="carta-grid">
          <div className="carta-item">
            <div className="carta-header">NUESTROS VINOS</div>
            <div className="carta-image" style={{ backgroundImage: `url(${fotoVinos})` }}></div>
            <button onClick={() => openPdfModal(cartaVinos, 'Carta de Vinos')} className="carta-btn">
              Carta de vinos
            </button>
          </div>
          <div className="carta-item">
            <div className="carta-header">NUESTROS SPRITZS</div>
            <div className="carta-image spritz"></div>
            <button onClick={() => openPdfModal(cartaCocteleria, 'Carta de Spritz')} className="carta-btn">
              Carta de spritz
            </button>
          </div>
          <div className="carta-item">
            <div className="carta-header">NUESTROS CÓCTELES</div>
            <div className="carta-image" style={{ backgroundImage: `url(${fotoCocteles})` }}></div>
            <button onClick={() => openPdfModal(cartaCocteleria, 'Carta de Cócteles')} className="carta-btn">
              Carta de coctelería
            </button>
          </div>
        </div>
      </section>

      {/* Galería - Carrusel Desayunos */}
      <section id="galeria" className="galeria-section">
        <h2>Nuestros Desayunos</h2>
        <div className="carrusel">
          <div className="carrusel-container" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
            {desayunosSlides.map((img, idx) => (
              <div key={idx} className="carrusel-slide">
                <img src={img} alt={`Desayuno ${idx + 1}`} />
              </div>
            ))}
          </div>
          <div className="carrusel-dots">
            {desayunosSlides.map((_, idx) => (
              <span 
                key={idx} 
                className={`dot ${currentSlide === idx ? 'active' : ''}`}
                onClick={() => setCurrentSlide(idx)}
              ></span>
            ))}
          </div>
        </div>
      </section>

      {/* Carrusel Sala */}
      <section className="galeria-section alt">
        <h2>Nuestro Espacio</h2>
        <div className="carrusel">
          <div className="carrusel-container" style={{ transform: `translateX(-${currentSlide2 * 100}%)` }}>
            {salaSlides.map((img, idx) => (
              <div key={idx} className="carrusel-slide">
                <img src={img} alt={`Espacio ${idx + 1}`} />
              </div>
            ))}
          </div>
          <div className="carrusel-dots">
            {salaSlides.map((_, idx) => (
              <span 
                key={idx} 
                className={`dot ${currentSlide2 === idx ? 'active' : ''}`}
                onClick={() => setCurrentSlide2(idx)}
              ></span>
            ))}
          </div>
        </div>
      </section>

      {/* Carrusel Especialidades */}
      <section className="galeria-section">
        <h2>Nuestras Especialidades</h2>
        <div className="carrusel">
          <div className="carrusel-container" style={{ transform: `translateX(-${currentSlide3 * 100}%)` }}>
            {especialidadesSlides.map((img, idx) => (
              <div key={idx} className="carrusel-slide">
                <img src={img} alt={`Especialidad ${idx + 1}`} />
              </div>
            ))}
          </div>
          <div className="carrusel-dots">
            {especialidadesSlides.map((_, idx) => (
              <span 
                key={idx} 
                className={`dot ${currentSlide3 === idx ? 'active' : ''}`}
                onClick={() => setCurrentSlide3(idx)}
              ></span>
            ))}
          </div>
        </div>
      </section>

      {/* Eventos */}
      <section className="eventos-section">
        <div className="eventos-image" style={{ backgroundImage: `url(${fotoSala})` }}></div>
        <div className="eventos-content">
          <h2>EVENTOS</h2>
          <p>Contacte con nosotros para organizar su cena de empresa, cumpleaños, bautizo, comunión...</p>
          <a href="https://wa.me/34630713713" target="_blank" rel="noopener noreferrer" className="eventos-btn">
            Contáctanos
          </a>
        </div>
      </section>

      {/* Reservas */}
      <section id="reservas" className="reservas-section">
        <div className="reservas-container">
          <h2>Crear una nueva reserva</h2>
          <form onSubmit={handleReservaSubmit} className="reserva-form">
            <div className="form-group">
              <label>Nombre:</label>
              <input 
                type="text" 
                name="nombre" 
                value={reserva.nombre}
                onChange={handleReservaChange}
                required 
              />
            </div>
            <div className="form-group">
              <label>Teléfono de contacto:</label>
              <input 
                type="tel" 
                name="telefono" 
                value={reserva.telefono}
                onChange={handleReservaChange}
                required 
              />
            </div>
            <div className="form-group">
              <label>Fecha:</label>
              <input 
                type="date" 
                name="fecha" 
                value={reserva.fecha}
                onChange={handleReservaChange}
                min={getMinDate()}
                required 
              />
            </div>
            <div className="form-group">
              <label>Hora:</label>
              <select 
                name="hora" 
                value={reserva.hora}
                onChange={handleReservaChange}
                required
                disabled={!reserva.fecha || getAvailableHours(reserva.fecha).length === 0}
              >
                <option value="">-- : --</option>
                {getAvailableHours(reserva.fecha).map(hora => (
                  <option key={hora} value={hora}>{hora}</option>
                ))}
              </select>
              {reserva.fecha && getDayOfWeek(reserva.fecha) === 3 && (
                <span className="error-msg">Los miércoles estamos cerrados</span>
              )}
            </div>
            <div className="form-group">
              <label>Número de personas:</label>
              <input 
                type="number" 
                name="personas" 
                value={reserva.personas}
                onChange={handleReservaChange}
                min="1"
                max="20"
                required 
              />
            </div>
            <button type="submit" className="reserva-btn">Reservar</button>
            {mensajeReserva && <p className="mensaje-reserva">{mensajeReserva}</p>}
          </form>
          <p className="reserva-note">No se pueden hacer reservas para el día en curso.</p>
          <p className="reserva-note">En caso de realizar una reserva y no estar a la hora acordada, si no se notifica que se va a llegar tarde, la mesa será entregada a otro cliente pasados 15 minutos.</p>
        </div>
      </section>

      {/* Sobre Nosotros */}
      <section id="nosotros" className="nosotros-section">
        <div className="nosotros-images">
          <img src={fotoCarne} alt="Productos gallegos" />
          <img src={pulpo} alt="Nuestros productos" />
        </div>
        <div className="nosotros-content">
          <h2>SOBRE NOSOTROS</h2>
          <p>
            El restaurante Néboa se encuentra ubicado en el número 21 de la calle Valle Inclán en Ourense, 
            trasladándose desde la Ribeira Sacra al centro de la ciudad para ampliar la oferta gastronómica 
            en una de las calles con mayor variedad de la ciudad.
          </p>
          <p>
            Fundado por Estéfano Varela, el restaurante se centra en una cocina tradicional gallega con 
            materia prima de primer nivel, modernizada en sus elaboraciones. La carta se adapta a la temporada, 
            ofreciendo platos más frescos en verano y recetas estrella como el cocido en invierno.
          </p>
          <p>
            Destacan nuestras carnes de raza rubia gallega, con algún aporte de Angus y buey, servidas en 
            cortes como entrecot o chuletón, con un especialista dedicado exclusivamente a su corte. Además, 
            incluimos productos gallegos como quesos de Airas Moniz, O Rexo o O Cebreiro.
          </p>
        </div>
      </section>

      {/* Equipo */}
      <section className="equipo-section">
        <div className="equipo-content">
          <img src={neboaProfile} alt="Equipo Néboa" className="equipo-img" />
          <div className="equipo-text">
            <h3>Nuestro Equipo</h3>
            <p><em>"A cociña nace onde a néboa bica a terra"</em></p>
            <p>El local fue completamente reformado, pasando de bar a restaurante, y el equipo actual sigue siendo el mismo que el del primer proyecto de Estéfano en la casa rural A Forxa.</p>
          </div>
        </div>
      </section>

      {/* Horario */}
      <section className="horario-section">
        <h2>Horario</h2>
        <div className="horario-container">
          <table className="horario-table">
            <thead>
              <tr>
                <th></th>
                <th>LUNES</th>
                <th>MARTES</th>
                <th>MIÉRCOLES</th>
                <th>JUEVES</th>
                <th>VIERNES</th>
                <th>SÁBADO</th>
                <th>DOMINGO</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="label">APERTURA MAÑANA</td>
                <td>09:00</td>
                <td>09:00</td>
                <td className="cerrado"></td>
                <td>09:00</td>
                <td>09:00</td>
                <td>12:00</td>
                <td>12:00</td>
              </tr>
              <tr>
                <td className="label">Comidas</td>
                <td>13:00-15:30</td>
                <td>13:00-15:30</td>
                <td className="cerrado"></td>
                <td>13:00-15:30</td>
                <td>13:00-15:30</td>
                <td>13:00-15:30</td>
                <td>13:00-15:30</td>
              </tr>
              <tr>
                <td className="label">CIERRE MAÑANA</td>
                <td>17:00</td>
                <td>17:00</td>
                <td className="cerrado"></td>
                <td>17:00</td>
                <td>17:00</td>
                <td>17:00</td>
                <td>17:00</td>
              </tr>
              <tr>
                <td className="label">APERTURA TARDE</td>
                <td className="cerrado"></td>
                <td className="cerrado"></td>
                <td className="cerrado"></td>
                <td>20:00</td>
                <td>20:00</td>
                <td>20:00</td>
                <td className="cerrado"></td>
              </tr>
              <tr>
                <td className="label">Cenas</td>
                <td className="cerrado"></td>
                <td className="cerrado"></td>
                <td className="cerrado"></td>
                <td>20:00-23:30</td>
                <td>20:00-23:30</td>
                <td>20:00-23:30</td>
                <td className="cerrado"></td>
              </tr>
              <tr>
                <td className="label">CIERRE</td>
                <td className="cerrado"></td>
                <td className="cerrado"></td>
                <td className="cerrado"></td>
                <td>01:00</td>
                <td>01:00</td>
                <td>01:00</td>
                <td className="cerrado"></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="horario-telefono">📞 Teléfono de reservas: <a href="tel:+34630713713">630 713 713</a></p>
      </section>

      {/* Contacto / Footer */}
      <footer id="contacto" className="footer">
        <div className="footer-content">
          <div className="footer-logo">
            <img src={logo} alt="Néboa" />
            <p>– OURENSE –</p>
          </div>
          <div className="footer-info">
            <h3>Contacto</h3>
            <p>📍 Calle Valle Inclán, 21 - Ourense</p>
            <p>📞 <a href="tel:+34630713713">630 713 713</a></p>
            <p>📧 <a href="mailto:info@neboa.es">info@neboa.es</a></p>
          </div>
          <div className="footer-social">
            <h3>Síguenos</h3>
            <div className="social-links">
              <a href="https://www.instagram.com/restauranteneboaourense/" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                Instagram
              </a>
              <a href="https://wa.me/34630713713" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 Restaurante Néboa - Ourense. Todos los derechos reservados.</p>
        </div>
      </footer>
      {/* Modal para visualizar PDFs */}
      {pdfModal.isOpen && (
        <div className="pdf-modal" onClick={closePdfModal}>
          <div className="pdf-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-modal-header">
              <h3>{pdfModal.title}</h3>
              <button className="close-pdf-modal" onClick={closePdfModal}>
                ✕
              </button>
            </div>
            <iframe
              src={pdfModal.pdfUrl}
              title={pdfModal.title}
              className="pdf-viewer"
            />
          </div>
        </div>
      )}    </>
  )
}

export default App
