import ScrollReveal from '../ScrollReveal/ScrollReveal'
import './Horario.css'

const Horario = () => {
  return (
    <section className="horario-section">
      <ScrollReveal animation="fade-up">
        <h2>Horario</h2>
      </ScrollReveal>

      <ScrollReveal animation="fade-up" delay={0.2}>
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
                <td className="label">APERTURA COMIDAS</td>
                <td className="cerrado"></td>
                <td className="cerrado"></td>
                <td>12:30</td>
                <td>12:30</td>
                <td>12:30</td>
                <td>12:30</td>
                <td>12:30</td>
              </tr>
              <tr>
                <td className="label">Horario cocina (comidas)</td>
                <td className="cerrado"></td>
                <td className="cerrado"></td>
                <td>13:00-15:45</td>
                <td>13:00-15:45</td>
                <td>13:00-15:45</td>
                <td>13:00-15:45</td>
                <td>13:00-15:45</td>
              </tr>
              <tr>
                <td className="label">CIERRE COMIDAS</td>
                <td className="cerrado"></td>
                <td className="cerrado"></td>
                <td>17:00</td>
                <td>17:00</td>
                <td>17:00</td>
                <td>17:00</td>
                <td>17:00</td>
              </tr>
              <tr>
                <td className="label">APERTURA CENAS</td>
                <td className="cerrado"></td>
                <td className="cerrado"></td>
                <td className="cerrado"></td>
                <td className="cerrado"></td>
                <td>19:00</td>
                <td>19:00</td>
                <td className="cerrado"></td>
              </tr>
              <tr>
                <td className="label">Horario cocina (cenas)</td>
                <td className="cerrado"></td>
                <td className="cerrado"></td>
                <td className="cerrado"></td>
                <td className="cerrado"></td>
                <td>21:00-22:30</td>
                <td>21:00-22:30</td>
                <td className="cerrado"></td>
              </tr>
              <tr>
                <td className="label">CIERRE NOCHE</td>
                <td className="cerrado"></td>
                <td className="cerrado"></td>
                <td className="cerrado"></td>
                <td className="cerrado"></td>
                <td>00:00</td>
                <td>00:00</td>
                <td className="cerrado"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </ScrollReveal>

      <ScrollReveal animation="fade-up" delay={0.25}>
        <p className="horario-nota">Lunes y martes: descanso de personal.</p>
        <p className="horario-cocina">(Horario de cocina) 13:00-15:45 · 21:00-22:30 (viernes y sábado).</p>
      </ScrollReveal>

      <ScrollReveal animation="fade-up" delay={0.3}>
        <p className="horario-telefono">📞 Teléfono de reservas: <a href="tel:+34988664795">988 664 795</a></p>
      </ScrollReveal>
    </section>
  )
}

export default Horario
