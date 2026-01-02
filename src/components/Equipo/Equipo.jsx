import neboaProfile from '../../img/neboa_profile.png'
import './Equipo.css'

const Equipo = () => {
  return (
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
  )
}

export default Equipo
