import { useState } from 'react'
import { InstagramIcon, WhatsAppIcon } from '../icons/SocialIcons'
import logo from '../../img/logo_neboa.jpg'
import './Navbar.css'

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  return (
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
            <InstagramIcon />
          </a>
          <a href="https://wa.me/34630713713" target="_blank" rel="noopener noreferrer" className="social-icon whatsapp">
            <WhatsAppIcon />
          </a>
        </div>
        <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
