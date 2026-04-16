import ScrollReveal from '../ScrollReveal/ScrollReveal'
import { useHorario, formatTime } from '../../hooks/useHorario'
import './Horario.css'

// Orden de columnas: Lunes→Sábado→Domingo (como en el diseño original)
const DIAS_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

// Filas fijas de la tabla y si pertenecen al turno de cenas
const TABLE_ROWS = [
  {
    label: 'APERTURA COMIDAS',
    isDinner: false,
    getValue: (c) => formatTime(c.apertura_comidas),
  },
  {
    label: 'Horario cocina (comidas)',
    isDinner: false,
    getValue: (c) =>
      `${formatTime(c.turno_mediodia_inicio)}-${formatTime(c.turno_mediodia_fin)}`,
  },
  {
    label: 'CIERRE COMIDAS',
    isDinner: false,
    getValue: (c) => formatTime(c.cierre_comidas),
  },
  {
    label: 'APERTURA CENAS',
    isDinner: true,
    getValue: (c) => formatTime(c.apertura_cenas),
  },
  {
    label: 'Horario cocina (cenas)',
    isDinner: true,
    getValue: (c) =>
      `${formatTime(c.turno_noche_inicio)}-${formatTime(c.turno_noche_fin)}`,
  },
  {
    label: 'CIERRE NOCHE',
    isDinner: true,
    getValue: (c) => formatTime(c.cierre_noche),
  },
]

const Horario = () => {
  const { horariosPorDia, configuracion, loading, error } = useHorario()

  const diasOrdenados = DIAS_DISPLAY_ORDER.map((d) => horariosPorDia?.get(d)).filter(Boolean)

  const diasCerradosNombres = horariosPorDia
    ? DIAS_DISPLAY_ORDER
        .map((d) => horariosPorDia.get(d))
        .filter((d) => d?.cerrado)
        .map((d) => d.nombre)
        .join(' y ')
    : ''

  const turnoInfo =
    configuracion
      ? `(Horario de cocina) ${formatTime(configuracion.turno_mediodia_inicio)}-${formatTime(configuracion.turno_mediodia_fin)} · ${formatTime(configuracion.turno_noche_inicio)}-${formatTime(configuracion.turno_noche_fin)} (viernes y sábado).`
      : ''

  return (
    <section className="horario-section">
      <ScrollReveal animation="fade-up">
        <h2>Horario</h2>
      </ScrollReveal>

      <ScrollReveal animation="fade-up" delay={0.2}>
        <div className="horario-container">
          {loading ? (
            <div className="horario-loading">Cargando horario…</div>
          ) : error ? (
            <p className="horario-nota">No se pudo cargar el horario. Llámanos para más información.</p>
          ) : (
            <table className="horario-table">
              <thead>
                <tr>
                  <th></th>
                  {diasOrdenados.map((dia) => (
                    <th key={dia.dia_semana}>{dia.nombre.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row) => (
                  <tr key={row.label}>
                    <td className="label">{row.label}</td>
                    {diasOrdenados.map((dia) => {
                      const cerrada = dia.cerrado || (row.isDinner && dia.solo_mediodia)
                      return (
                        <td key={dia.dia_semana} className={cerrada ? 'cerrado' : ''}>
                          {cerrada ? '' : configuracion ? row.getValue(configuracion) : ''}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </ScrollReveal>

      {!loading && !error && (
        <>
          <ScrollReveal animation="fade-up" delay={0.25}>
            {diasCerradosNombres && (
              <p className="horario-nota">
                {diasCerradosNombres}: descanso de personal.
              </p>
            )}
            {turnoInfo && (
              <p className="horario-cocina">{turnoInfo}</p>
            )}
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={0.3}>
            <p className="horario-telefono">
              📞 Teléfono de reservas:{' '}
              <a href="tel:+34988664795">988 664 795</a>
            </p>
          </ScrollReveal>
        </>
      )}
    </section>
  )
}

export default Horario
