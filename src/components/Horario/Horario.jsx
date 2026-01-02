import './Horario.css'

const Horario = () => {
  return (
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
  )
}

export default Horario
