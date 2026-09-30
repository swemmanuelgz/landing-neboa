import ScrollReveal from '../ScrollReveal/ScrollReveal'
import { useHorario, formatTime } from '../../hooks/useHorario'
import './Horario.css'

// Orden de columnas: Lunes→Sábado→Domingo (como en el diseño original)
const DIAS_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

// Filas de la tabla: turnos de reserva de nexum-restaurant (no hay horas de apertura/cierre del local).
const TABLE_ROWS = [
  {
    label: 'Comidas',
    isDinner: false,
    getValue: (c) =>
      c.turno_mediodia_inicio ? `${formatTime(c.turno_mediodia_inicio)}-${formatTime(c.turno_mediodia_fin)}` : '',
  },
  {
    label: 'Cenas',
    isDinner: true,
    getValue: (c) =>
      c.turno_noche_inicio ? `${formatTime(c.turno_noche_inicio)}-${formatTime(c.turno_noche_fin)}` : '',
  },
]

const Horario = () => {
  const { horariosPorDia, configuracion, loading, error } = useHorario()

  const diasOrdenados = DIAS_DISPLAY_ORDER.map((d) => horariosPorDia?.get(d)).filter(Boolean)

  const filas = configuracion ? TABLE_ROWS.filter((row) => row.getValue(configuracion)) : []

  // Días que abren también por la noche (p. ej. "viernes y sábado").
  const diasConCena = DIAS_DISPLAY_ORDER
    .map((d) => horariosPorDia?.get(d))
    .filter((d) => d && !d.cerrado && !d.solo_mediodia)
    .map((d) => d.nombre.toLowerCase())
  const textoDiasCena = diasConCena.length > 1
    ? `${diasConCena.slice(0, -1).join(', ')} y ${diasConCena[diasConCena.length - 1]}`
    : diasConCena[0] || ''

  const diasCerradosNombres = horariosPorDia
    ? DIAS_DISPLAY_ORDER
        .map((d) => horariosPorDia.get(d))
        .filter((d) => d?.cerrado)
        .map((d) => d.nombre)
        .join(' y ')
    : ''

  const turnoInfo =
    configuracion?.turno_mediodia_inicio
      ? `Reservas: comidas ${formatTime(configuracion.turno_mediodia_inicio)}-${formatTime(configuracion.turno_mediodia_fin)}` +
        (configuracion.turno_noche_inicio
          ? ` · cenas ${formatTime(configuracion.turno_noche_inicio)}-${formatTime(configuracion.turno_noche_fin)}${textoDiasCena ? ` (${textoDiasCena})` : ''}.`
          : '.')
      : ''

  return (
    <section className="horario-section">
      <ScrollReveal animation="fade-up">
        <h2>Horario de reservas</h2>
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
                {filas.map((row) => (
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
