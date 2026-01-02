import './Bienvenida.css'

const Bienvenida = () => {
  return (
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
  )
}

export default Bienvenida
