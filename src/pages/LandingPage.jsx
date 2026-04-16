import {
  AdSenseAutoAds,
  Navbar,
  Hero,
  Bienvenida,
  Carta,
  Galeria,
  Eventos,
  Reservas,
  Nosotros,
  Equipo,
  Horario,
  Footer,
  ScrollReveal
} from '../components'

const LandingPage = () => (
  <>
    <AdSenseAutoAds />
    <Navbar />
    <Hero />

    <ScrollReveal animation="fade-up" delay={0.1}>
      <Bienvenida />
    </ScrollReveal>

    <ScrollReveal animation="fade-up" delay={0.1}>
      <Carta />
    </ScrollReveal>

    <ScrollReveal animation="fade-up" delay={0.1}>
      <Galeria />
    </ScrollReveal>

    <ScrollReveal animation="fade-up" delay={0.1}>
      <Eventos />
    </ScrollReveal>

    <ScrollReveal animation="fade-up" delay={0.1}>
      <Reservas />
    </ScrollReveal>

    <ScrollReveal animation="fade-up" delay={0.1}>
      <Nosotros />
    </ScrollReveal>

    <ScrollReveal animation="fade-up" delay={0.1}>
      <Equipo />
    </ScrollReveal>

    <ScrollReveal animation="fade-up" delay={0.1}>
      <Horario />
    </ScrollReveal>

    <Footer />
  </>
)

export default LandingPage
