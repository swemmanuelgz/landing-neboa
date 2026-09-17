import { useState } from 'react'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import es from 'react-phone-input-2/lang/es.json'
import Swal from 'sweetalert2'
import {
  useHorario,
  estaDiaCerrado,
  esSoloMediodia,
  obtenerHorariosValidos,
} from '../../hooks/useHorario'
import './Reservas.css'

const REQUEST_TIMEOUT = 25000
// Punto de entrada unico de la landing: consulta disponibilidad y crea la reserva
// directamente contra Supabase. La Edge Function dispara despues el side effect
// de n8n (Calendar + Gmail + WhatsApp).
const RESERVAS_WEB_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reservas-web`
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const SOURCE = 'web'

const MENSAJES = {
  DIA_CERRADO: '❌ Este día estamos cerrados. Por favor, selecciona otro día.',
  SOLO_MEDIODIA: 'ℹ️ Este día solo abrimos a mediodía.',
  FECHA_CERRADA: '❌ Este día cerramos por descanso. Por favor, selecciona otro día.',
  CENA_ESPECIAL: '🎉 ¡Día especial! También abrimos para cenas.',
}

const Reservas = () => {
  const { horariosPorDia, configuracion, excepcionesPorFecha, loading: loadingHorario } = useHorario()

  const [reserva, setReserva] = useState({
    nombre: '',
    telefono: '',
    fecha: '',
    hora: '',
    personas: '',
    notas: ''
  })
  const [mensajeReserva, setMensajeReserva] = useState('')
  const [reservaStatus, setReservaStatus] = useState('idle')
  const [alternativas, setAlternativas] = useState([])
  const [reservaId, setReservaId] = useState(null)
  
  // NUEVO: Estado para el modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingReserva, setPendingReserva] = useState(null)
  
  // Función helper para fetch con timeout
  const fetchWithTimeout = async (url, options, timeout = REQUEST_TIMEOUT) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('TIMEOUT')
      }
      throw error
    }
  }

  // Llama a la Edge Function `reservas-web` y devuelve el JSON del servidor.
  // Lanza Error con: TIMEOUT | RESPUESTA_INVALIDA | VALIDACION:<msg> | HTTP <n>
  const llamarReservasWeb = async (payload) => {
    const response = await fetchWithTimeout(RESERVAS_WEB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify(payload)
    })

    const texto = await response.text()
    let data = null
    try {
      data = texto && texto.trim() ? JSON.parse(texto) : null
    } catch {
      data = null
    }

    if (!data) throw new Error('RESPUESTA_INVALIDA')
    if (response.status === 400 && data.error) throw new Error(`VALIDACION:${data.error}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return data
  }

  const mensajeDeError = (error) => {
    if (error.message === 'TIMEOUT') return '⏱️ El servidor no responde. Por favor, llámanos al 988 664 795.'
    if (error.message === 'RESPUESTA_INVALIDA') return '⚠️ Respuesta no válida del servidor. Por favor, llámanos.'
    if (error.message.startsWith('VALIDACION:')) return `⚠️ ${error.message.slice('VALIDACION:'.length)}`
    return '❌ Error de conexión. Por favor, llámanos al 988 664 795.'
  }

  // Mostrar error de sistema con SweetAlert
  const showSystemError = () => {
    Swal.fire({
      icon: 'error',
      title: '❌ Error del sistema',
      html: `
        <p>Ha ocurrido un error al procesar tu solicitud.</p>
        <p style="margin-top: 15px;"><strong>Por favor, llámanos para hacer tu reserva:</strong></p>
        <p style="font-size: 1.5rem; margin-top: 10px;">📞 <a href="tel:+34988664795" style="color: #c4b5a4; text-decoration: none;">988 664 795</a></p>
      `,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#c4b5a4',
      background: '#2a2a2a',
      color: '#ffffff'
    })
  }

  // Utilidades de fecha
  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30)
    return maxDate.toISOString().split('T')[0]
  }

  const getDayOfWeek = (dateString) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.getDay()
  }

  const getAvailableHours = (dateString) => {
    if (!dateString || loadingHorario) return []
    const day = getDayOfWeek(dateString)
    return obtenerHorariosValidos(day, dateString, horariosPorDia, excepcionesPorFecha, configuracion)
  }

  const getMensajeFecha = (diaSemana, fecha) => {
    if (excepcionesPorFecha?.get(fecha) === 'cerrado') return MENSAJES.FECHA_CERRADA
    if (estaDiaCerrado(diaSemana, fecha, horariosPorDia, excepcionesPorFecha)) return MENSAJES.DIA_CERRADO
    if (excepcionesPorFecha?.get(fecha) === 'cena_especial') return MENSAJES.CENA_ESPECIAL
    if (esSoloMediodia(diaSemana, fecha, horariosPorDia, excepcionesPorFecha)) return MENSAJES.SOLO_MEDIODIA
    return ''
  }

  const diasCerradosTexto = horariosPorDia
    ? [...horariosPorDia.values()].filter(d => d.cerrado).map(d => d.nombre).join(' y ')
    : ''

  // Formatear fecha para mostrar
  const formatearFechaDisplay = (fechaISO) => {
    const [year, month, day] = fechaISO.split('-')
    const fecha = new Date(fechaISO + 'T12:00:00')
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    return `${dias[fecha.getDay()]} ${parseInt(day)} de ${meses[parseInt(month) - 1]} de ${year}`
  }

  const handleReservaChange = (e) => {
    const { name, value } = e.target
    
    if (name === 'fecha' && value) {
      const selectedDate = new Date(value + 'T00:00:00')
      const minDate = new Date(getMinDate() + 'T00:00:00')
      const maxDate = new Date(getMaxDate() + 'T00:00:00')

      if (selectedDate < minDate || selectedDate > maxDate) {
        setMensajeReserva('❌ Solo puedes hacer reservas con hasta 30 días de antelación.')
        setTimeout(() => setMensajeReserva(''), 3000)
        return
      }

      const day = getDayOfWeek(value)
      if (estaDiaCerrado(day, value, horariosPorDia, excepcionesPorFecha)) {
        setMensajeReserva(getMensajeFecha(day, value))
        setTimeout(() => setMensajeReserva(''), 4000)
        return
      }

      const mensajeInfo = getMensajeFecha(day, value)
      if (mensajeInfo) {
        setMensajeReserva(mensajeInfo)
        setTimeout(() => setMensajeReserva(''), 4000)
      }
    }
    
    setReserva(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'fecha' ? { hora: '' } : {})
    }))
    
    if (mensajeReserva && name === 'fecha') {
      setMensajeReserva('')
    }
  }

  // PASO 1: Consultar disponibilidad
  const handleReservaSubmit = async (e) => {
    e.preventDefault()
    
    // Validación de campos obligatorios
    if (!reserva.nombre || !reserva.nombre.trim()) {
      Swal.fire({
        icon: 'warning',
        title: '⚠️ Campo requerido',
        text: 'Por favor, ingresa tu nombre.',
        confirmButtonColor: '#c4b5a4',
        background: '#2a2a2a',
        color: '#ffffff'
      })
      return
    }
    
    if (!reserva.telefono || !reserva.telefono.trim()) {
      Swal.fire({
        icon: 'warning',
        title: '⚠️ Teléfono requerido',
        text: 'Por favor, ingresa tu número de teléfono.',
        confirmButtonColor: '#c4b5a4',
        background: '#2a2a2a',
        color: '#ffffff'
      })
      return
    }
    
    if (!reserva.fecha) {
      Swal.fire({
        icon: 'warning',
        title: '⚠️ Fecha requerida',
        text: 'Por favor, selecciona una fecha.',
        confirmButtonColor: '#c4b5a4',
        background: '#2a2a2a',
        color: '#ffffff'
      })
      return
    }
    
    if (!reserva.hora) {
      Swal.fire({
        icon: 'warning',
        title: '⚠️ Hora requerida',
        text: 'Por favor, selecciona una hora.',
        confirmButtonColor: '#c4b5a4',
        background: '#2a2a2a',
        color: '#ffffff'
      })
      return
    }
    
    if (!reserva.personas || parseInt(reserva.personas) < 1) {
      Swal.fire({
        icon: 'warning',
        title: '⚠️ Número de personas requerido',
        text: 'Por favor, indica cuántas personas sois.',
        confirmButtonColor: '#c4b5a4',
        background: '#2a2a2a',
        color: '#ffffff'
      })
      return
    }
    
    const day = getDayOfWeek(reserva.fecha)
    if (estaDiaCerrado(day, reserva.fecha, horariosPorDia, excepcionesPorFecha)) {
      setMensajeReserva(getMensajeFecha(day, reserva.fecha))
      return
    }

    const telefonoFormateado = reserva.telefono.startsWith('+') ? reserva.telefono : `+${reserva.telefono}`

    setReservaStatus('loading')
    setMensajeReserva('⏳ Comprobando disponibilidad...')
    setAlternativas([])

    try {
      const data = await llamarReservasWeb({
        action: 'check',
        fecha: reserva.fecha,
        hora: reserva.hora,
        invitados: parseInt(reserva.personas)
      })

      if (data.estado === 'disponible') {
        setPendingReserva({
          fecha: reserva.fecha,
          fechaFormateada: formatearFechaDisplay(reserva.fecha),
          hora: reserva.hora,
          personas: reserva.personas,
          nombre: reserva.nombre.trim(),
          telefono: telefonoFormateado,
          notas: reserva.notas || '',
          turno: data.turno
        })
        setReservaStatus('pending_confirm')
        setMensajeReserva('')
        setShowConfirmModal(true)

      } else if (data.estado === 'alternativas') {
        setAlternativas(Array.isArray(data.alternativas) ? data.alternativas : [])
        setReservaStatus('alternatives')
        setMensajeReserva(data.mensaje || `⚠️ No hay disponibilidad a las ${reserva.hora}`)

      } else if (data.estado === 'grupo_grande') {
        setReservaStatus('error')
        setMensajeReserva(data.mensaje || '⚠️ Para grupos grandes, llámanos.')
        Swal.fire({
          icon: 'info',
          title: '👥 Grupo grande',
          html: `<p>${data.mensaje || 'Para grupos grandes hay que reservar por teléfono.'}</p>
                 <p style="font-size:1.4rem;margin-top:12px;">📞 <a href="tel:+34988664795" style="color:#c4b5a4;text-decoration:none;">988 664 795</a></p>`,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#c4b5a4',
          background: '#2a2a2a',
          color: '#ffffff'
        })

      } else {
        setReservaStatus('full')
        setMensajeReserva(data.mensaje || '❌ No hay disponibilidad para ese día. Prueba con otra fecha.')
      }

    } catch (error) {
      console.error('Error al consultar disponibilidad:', error)
      setReservaStatus('error')
      setMensajeReserva(mensajeDeError(error))
      showSystemError()
    }
  }

  // PASO 2: Crear la reserva definitiva en Supabase
  const confirmarReserva = async () => {
    if (!pendingReserva) return

    setShowConfirmModal(false)
    setReservaStatus('loading')
    setMensajeReserva('⏳ Creando tu reserva...')

    try {
      const data = await llamarReservasWeb({
        action: 'create',
        fecha: pendingReserva.fecha,
        hora: pendingReserva.hora,
        invitados: parseInt(pendingReserva.personas),
        nombre: pendingReserva.nombre,
        telefono: pendingReserva.telefono,
        notas: pendingReserva.notas || '',
        source: SOURCE
      })

      // La mesa pudo ocuparse entre la consulta y la confirmación
      if (data.estado !== 'reserva_creada') {
        if (data.estado === 'alternativas') {
          setAlternativas(Array.isArray(data.alternativas) ? data.alternativas : [])
          setReservaStatus('alternatives')
          setMensajeReserva(data.mensaje || '⚠️ Esa hora acaba de ocuparse. Elige otra.')
        } else {
          setReservaStatus('full')
          setMensajeReserva(data.mensaje || '❌ Esa mesa acaba de ocuparse. Prueba con otra hora.')
        }
        setPendingReserva(null)
        return
      }

      setReservaId(data.reserva_id)
      setReservaStatus('success')
      setMensajeReserva('✅ ¡Reserva confirmada!')

      Swal.fire({
        icon: 'success',
        title: '🎉 ¡Reserva confirmada!',
        html: `<p>${data.mensaje || 'Tu reserva ha quedado registrada.'}</p>
               <p style="margin-top:12px;">📋 ID de reserva: <strong>${data.reserva_id}</strong></p>
               <p style="margin-top:8px;">Recibirás un WhatsApp de confirmación en breve.</p>`,
        confirmButtonText: '¡Genial!',
        confirmButtonColor: '#c4b5a4',
        background: '#2a2a2a',
        color: '#ffffff',
        timer: 15000,
        timerProgressBar: true
      })

      setTimeout(() => {
        setReserva({ nombre: '', telefono: '', fecha: '', hora: '', personas: '', notas: '' })
        setReservaStatus('idle')
        setMensajeReserva('')
        setReservaId(null)
        setPendingReserva(null)
      }, 3000)

    } catch (error) {
      console.error('❌ Error al crear la reserva:', error)
      setReservaStatus('error')
      setMensajeReserva(mensajeDeError(error))
      showSystemError()
    }
  }

  // Cancelar confirmación
  const cancelarConfirmacion = () => {
    setShowConfirmModal(false)
    setPendingReserva(null)
    setReservaStatus('idle')
    setMensajeReserva('ℹ️ Reserva cancelada. No se ha guardado nada.')
    setTimeout(() => setMensajeReserva(''), 3000)
  }

  const selectAlternativa = (hora) => {
    setReserva(prev => ({ ...prev, hora }))
    setAlternativas([])
    setReservaStatus('idle')
    setMensajeReserva('🔄 Hora actualizada. Pulsa "Reservar" para confirmar.')
  }

  return (
    <section id="reservas" className="reservas-section">
      <div className="reservas-container">
        <h2>Crear una nueva reserva</h2>
        <form onSubmit={handleReservaSubmit} className="reserva-form">
          <div className="form-group">
            <label>Nombre:</label>
            <input 
              type="text" 
              name="nombre" 
              value={reserva.nombre}
              onChange={handleReservaChange}
              required 
            />
          </div>
          <div className="form-group">
            <label>Teléfono de contacto:</label>
            <PhoneInput
              country={'es'}
              value={reserva.telefono}
              onChange={phone => setReserva(prev => ({ ...prev, telefono: phone }))}
              localization={es}
              preferredCountries={['es', 'fr', 'pt', 'gb', 'de']}
              enableSearch={true}
              searchPlaceholder="Buscar país..."
              inputClass="phone-input-field"
              containerClass="phone-input-container"
              buttonClass="phone-input-button"
              dropdownClass="phone-input-dropdown"
              searchClass="phone-input-search"
            />
          </div>
          <div className="form-group">
            <label>Fecha:</label>
            <input 
              type="date" 
              name="fecha" 
              value={reserva.fecha}
              onChange={handleReservaChange}
              min={getMinDate()}
              max={getMaxDate()}
              required 
            />
            <small className="fecha-info">
              📅 Reservas hasta 30 días de antelación.
              {diasCerradosTexto && ` ${diasCerradosTexto}: cerrado.`}
            </small>
          </div>
          <div className="form-group">
            <label>Hora:</label>
            <select 
              name="hora" 
              value={reserva.hora}
              onChange={handleReservaChange}
              required
              disabled={!reserva.fecha || loadingHorario || getAvailableHours(reserva.fecha).length === 0}
            >
              <option value="">-- : --</option>
              {getAvailableHours(reserva.fecha).map(hora => (
                <option key={hora} value={hora}>{hora}</option>
              ))}
            </select>
            {reserva.fecha && estaDiaCerrado(getDayOfWeek(reserva.fecha), reserva.fecha, horariosPorDia, excepcionesPorFecha) && (
              <span className="error-msg">
                {diasCerradosTexto
                  ? `${diasCerradosTexto}: cerrado`
                  : 'Este día estamos cerrados'}
              </span>
            )}
          </div>
          <div className="form-group">
            <label>Número de personas:</label>
            <input 
              type="number" 
              name="personas" 
              value={reserva.personas}
              onChange={handleReservaChange}
              min="1"
              max="20"
              required 
            />
          </div>
          <div className="form-group">
            <label>Notas o sugerencias (opcional):</label>
            <textarea 
              name="notas" 
              value={reserva.notas}
              onChange={handleReservaChange}
              placeholder="Alergias, preferencias, ocasión especial..."
              rows="3"
              maxLength="500"
            />
            <small className="fecha-info">💬 Máximo 500 caracteres</small>
          </div>
          <button 
            type="submit" 
            className="reserva-btn"
            disabled={reservaStatus === 'loading' || reservaStatus === 'pending_confirm'}
          >
            {reservaStatus === 'loading' ? 'Comprobando...' : 'Reservar'}
          </button>
          
          {mensajeReserva && (
            <p className={`mensaje-reserva ${reservaStatus}`}>{mensajeReserva}</p>
          )}
          
          {reservaStatus === 'alternatives' && alternativas.length > 0 && (
            <div className="alternativas-container">
              <p className="alternativas-titulo">Horas disponibles:</p>
              <div className="alternativas-grid">
                {alternativas.map((hora, idx) => (
                  <button 
                    key={idx} 
                    type="button"
                    className="alternativa-btn"
                    onClick={() => selectAlternativa(hora)}
                  >
                    {hora}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {reservaStatus === 'success' && reservaId && (
            <p className="reserva-id">📋 ID de reserva: <strong>{reservaId}</strong></p>
          )}
        </form>
        <p className="reserva-note">No se pueden hacer reservas para el día en curso.</p>
        <p className="reserva-note">En caso de realizar una reserva y no estar a la hora acordada, si no se notifica que se va a llegar tarde, la mesa será entregada a otro cliente pasados 15 minutos.</p>
      </div>

      {/* MODAL DE CONFIRMACIÓN */}
      {showConfirmModal && pendingReserva && (
        <div className="confirm-modal-overlay" onClick={cancelarConfirmacion}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3>🍽️ Confirmar Reserva</h3>
            </div>
            <div className="confirm-modal-body">
              <p className="confirm-question">¿Estás seguro que quieres reservar?</p>
              <div className="confirm-details">
                <div className="confirm-detail">
                  <span className="detail-icon">📅</span>
                  <span className="detail-text">{formatearFechaDisplay(pendingReserva.fecha)}</span>
                </div>
                <div className="confirm-detail">
                  <span className="detail-icon">🕐</span>
                  <span className="detail-text">{pendingReserva.hora}</span>
                </div>
                <div className="confirm-detail">
                  <span className="detail-icon">👥</span>
                  <span className="detail-text">{pendingReserva.personas} {parseInt(pendingReserva.personas) === 1 ? 'persona' : 'personas'}</span>
                </div>
                <div className="confirm-detail">
                  <span className="detail-icon">👤</span>
                  <span className="detail-text">{pendingReserva.nombre}</span>
                </div>
                {pendingReserva.notas && (
                  <div className="confirm-detail">
                    <span className="detail-icon">💬</span>
                    <span className="detail-text">{pendingReserva.notas}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="confirm-modal-footer">
              <button className="confirm-btn cancel" onClick={cancelarConfirmacion}>
                ✕ Cancelar
              </button>
              <button className="confirm-btn accept" onClick={confirmarReserva}>
                ✓ Sí, confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Reservas
