import { InstagramIcon, WhatsAppIcon } from '../icons/SocialIcons'
import logo from '../../img/logo_neboa.jpg'
import './Footer.css'

const Footer = () => {
  return (
    <footer id="contacto" className="footer">
      <div className="footer-content">
        <div className="footer-logo">
          <img src={logo} alt="Néboa" />
          <p>– OURENSE –</p>
        </div>
        <div className="footer-info">
          <h3>Contacto</h3>
          <p>📍 Calle Valle Inclán, 21 - Ourense</p>
          <p>🤖 Asistente IA de reservas: <a href="tel:+34988664795">988 664 795</a></p>
          <p>📧 <a href="mailto:restauranteneboaourense@gmail.com">restauranteneboaourense@gmail.com</a></p>
        </div>
        <div className="footer-social">
          <h3>Síguenos</h3>
          <div className="social-links">
            <a href="https://www.instagram.com/restauranteneboaourense/" target="_blank" rel="noopener noreferrer">
              <InstagramIcon />
              Instagram
            </a>
            <a href="https://wa.me/34630713713" target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2025 Restaurante Néboa - Ourense. Todos los derechos reservados.</p>
        <p>
          <a href="https://nexumouai.com/" target="_blank" rel="noopener noreferrer">
            Desarrollado por NexumOu Ai SL
          </a>
        </p>
      </div>
    </footer>
  )
}

export default Footer
