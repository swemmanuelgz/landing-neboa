import fotoSala from '../../img/foto_sala.png'
import './Eventos.css'

const Eventos = () => {
  return (
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
  )
}

export default Eventos
