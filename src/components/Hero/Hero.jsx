import logo from '../../img/logo_neboa.jpg'
import './Hero.css'

const Hero = () => {
  return (
    <section id="inicio" className="hero">
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <img src={logo} alt="Néboa" className="hero-logo" />
        <p className="hero-subtitle">– OURENSE –</p>
      </div>
    </section>
  )
}

export default Hero
