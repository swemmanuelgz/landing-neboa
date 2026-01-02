import './styles/variables.css'
import {
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
  Footer
} from './components'

function App() {
  return (
    <>
      <Navbar />
      <Hero />
      <Bienvenida />
      <Carta />
      <Galeria />
      <Eventos />
      <Reservas />
      <Nosotros />
      <Equipo />
      <Horario />
      <Footer />
    </>
  )
}

export default App
