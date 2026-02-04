import { useState, useEffect } from 'react'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import es from 'react-phone-input-2/lang/es.json'
import Swal from 'sweetalert2'
import './Reservas.css'

// Constante para el timeout de las peticiones (10 segundos)
const REQUEST_TIMEOUT = 10000
const CACHE_KEY = 'neboa_reserva_temporal_id'

// ============================================================================
// 📅 CONFIGURACIÓN DE HORARIOS Y FECHAS ESPECIALES
// ============================================================================
// ¡EDITA AQUÍ! Esta sección es fácil de modificar para cambiar horarios,
// días cerrados y fechas especiales (carnavales, festivos, etc.)
// ============================================================================

const HORARIOS = {
  // -------------------------------------------------------------------------
  // DÍAS DE LA SEMANA CERRADOS (0=Domingo, 1=Lunes, ... 6=Sábado)
  // -------------------------------------------------------------------------
  DIAS_CERRADOS: [3], // Miércoles cerrado TODO el día
  
  // -------------------------------------------------------------------------
  // DÍAS QUE SOLO ABREN MEDIODÍA (sin cenas)
  // -------------------------------------------------------------------------
  DIAS_SOLO_MEDIODIA: [0, 1, 2], // Domingo, Lunes, Martes
  
  // -------------------------------------------------------------------------
  // TURNOS DE COMIDA Y CENA (horas de inicio y fin)
  // -------------------------------------------------------------------------
  TURNO_DESAYUNO: { inicio: '09:00', fin: '11:30' },
  TURNO_MEDIODIA: { inicio: '12:00', fin: '15:30' },
  TURNO_NOCHE: { inicio: '20:00', fin: '23:00' },
  
  // -------------------------------------------------------------------------
  // 🎭 FECHAS EXCEPCIÓN ABIERTAS (días normalmente cerrados que ABRIMOS)
  // -------------------------------------------------------------------------
  // Formato: 'YYYY-MM-DD'
  // Ejemplo: Carnavales 2026 - Abrimos domingo y lunes de carnaval
  FECHAS_EXCEPCION_ABIERTAS: [
    '2026-02-16', // Domingo de Carnaval - ABRIMOS con cenas
    '2026-02-17', // Lunes de Carnaval - ABRIMOS con cenas
  ],
  
  // -------------------------------------------------------------------------
  // 🚫 FECHAS EXCEPCIÓN CERRADAS (días normalmente abiertos que CERRAMOS)
  // -------------------------------------------------------------------------
  // Formato: 'YYYY-MM-DD'
  // Ejemplo: Descanso post-carnaval
  FECHAS_EXCEPCION_CERRADAS: [
    '2026-02-18', // Miércoles post-carnaval - CERRADO (pero es miércoles, ya cerrado)
    '2026-02-19', // Jueves post-carnaval - CERRAMOS para descanso
  ],
  
  // -------------------------------------------------------------------------
  // 🌙 FECHAS CON CENA ESPECIAL (días solo mediodía que TAMBIÉN abren cena)
  // -------------------------------------------------------------------------
  // Formato: 'YYYY-MM-DD'
  // Ejemplo: Si un domingo especial queremos abrir cenas
  FECHAS_CON_CENA_ESPECIAL: [
    '2026-02-16', // Domingo de Carnaval - cenas especiales
    '2026-02-17', // Lunes de Carnaval - cenas especiales
  ],
  
  // -------------------------------------------------------------------------
  // 💬 MENSAJES PARA EL USUARIO
  // -------------------------------------------------------------------------
  MENSAJES: {
    DIA_CERRADO: '❌ Este día estamos cerrados. Por favor, selecciona otro día.',
    SOLO_MEDIODIA: 'ℹ️ Este día solo abrimos a mediodía (12:00-15:30).',
    FECHA_CERRADA: '❌ Este día cerramos por descanso. Por favor, selecciona otro día.',
    CENA_ESPECIAL: '🎉 ¡Día especial! También abrimos para cenas.',
    CARNAVAL: '🎭 ¡Carnavales! Horario especial disponible.',
  }
}

// ============================================================================
// 🔧 FUNCIONES HELPER PARA HORARIOS
// ============================================================================
// Estas funciones usan la configuración de arriba. NO necesitas editarlas.
// ============================================================================

// Genera array de horas entre inicio y fin (cada 30 min)
const generarHoras = (inicio, fin) => {
  const horas = []
  let [h, m] = inicio.split(':').map(Number)
  const [finH, finM] = fin.split(':').map(Number)
  
  while (h < finH || (h === finH && m <= finM)) {
    horas.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    m += 30
    if (m >= 60) { m = 0; h++ }
  }
  return horas
}

// Verifica si una fecha es excepción abierta (carnavales, etc.)
const esFechaExcepcionAbierta = (fecha) => {
  return HORARIOS.FECHAS_EXCEPCION_ABIERTAS.includes(fecha)
}

// Verifica si una fecha es excepción cerrada (descanso, etc.)
const esFechaExcepcionCerrada = (fecha) => {
  return HORARIOS.FECHAS_EXCEPCION_CERRADAS.includes(fecha)
}

// Verifica si una fecha tiene cena especial
const tieneCenaEspecial = (fecha) => {
  return HORARIOS.FECHAS_CON_CENA_ESPECIAL.includes(fecha)
}

// Verifica si el día está cerrado (considerando excepciones)
const estaDiaCerrado = (diaSemana, fecha) => {
  // Si es excepción abierta, NO está cerrado
  if (esFechaExcepcionAbierta(fecha)) return false
  // Si es excepción cerrada, SÍ está cerrado
  if (esFechaExcepcionCerrada(fecha)) return true
  // Si no, verificar si el día de la semana está en DIAS_CERRADOS
  return HORARIOS.DIAS_CERRADOS.includes(diaSemana)
}

// Verifica si el día es solo mediodía (considerando excepciones)
const esSoloMediodia = (diaSemana, fecha) => {
  // Si tiene cena especial, NO es solo mediodía
  if (tieneCenaEspecial(fecha)) return false
  // Si no, verificar si el día de la semana está en DIAS_SOLO_MEDIODIA
  return HORARIOS.DIAS_SOLO_MEDIODIA.includes(diaSemana)
}

// Obtiene las horas disponibles para una fecha específica
const obtenerHorariosValidos = (diaSemana, fecha) => {
  // Si está cerrado, no hay horas
  if (estaDiaCerrado(diaSemana, fecha)) return []
  
  let horas = []
  
  // Determinar si incluir desayuno (L-V normales, no fines de semana)
  const tieneDesayuno = [1, 2, 4, 5].includes(diaSemana) && !esFechaExcepcionAbierta(fecha)
  
  // Siempre incluir mediodía (si no está cerrado)
  if (tieneDesayuno) {
    horas = [...generarHoras(HORARIOS.TURNO_DESAYUNO.inicio, HORARIOS.TURNO_DESAYUNO.fin)]
  }
  horas = [...horas, ...generarHoras(HORARIOS.TURNO_MEDIODIA.inicio, HORARIOS.TURNO_MEDIODIA.fin)]
  
  // Incluir cenas si NO es solo mediodía
  if (!esSoloMediodia(diaSemana, fecha)) {
    horas = [...horas, ...generarHoras(HORARIOS.TURNO_NOCHE.inicio, HORARIOS.TURNO_NOCHE.fin)]
  }
  
  return horas
}

// Obtiene el mensaje apropiado para una fecha
const obtenerMensajeFecha = (diaSemana, fecha) => {
  if (esFechaExcepcionCerrada(fecha)) {
    return HORARIOS.MENSAJES.FECHA_CERRADA
  }
  if (estaDiaCerrado(diaSemana, fecha)) {
    return HORARIOS.MENSAJES.DIA_CERRADO
  }
  if (esFechaExcepcionAbierta(fecha)) {
    return HORARIOS.MENSAJES.CARNAVAL
  }
  if (tieneCenaEspecial(fecha)) {
    return HORARIOS.MENSAJES.CENA_ESPECIAL
  }
  if (esSoloMediodia(diaSemana, fecha)) {
    return HORARIOS.MENSAJES.SOLO_MEDIODIA
  }
  return ''
}

const Reservas = () => {
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
  
  // Cache del ID de reserva temporal (persiste en localStorage)
  const [cachedReservaId, setCachedReservaId] = useState(() => {
    // Recuperar del localStorage al inicializar
    const saved = localStorage.getItem(CACHE_KEY)
    if (saved) {
      console.log('📦 ID temporal recuperado de localStorage:', saved)
      return saved
    }
    return null
  })

  // Sincronizar caché con localStorage
  useEffect(() => {
    if (cachedReservaId) {
      localStorage.setItem(CACHE_KEY, cachedReservaId)
      console.log('💾 ID temporal guardado en localStorage:', cachedReservaId)
    } else {
      localStorage.removeItem(CACHE_KEY)
      console.log('🗑️ ID temporal eliminado de localStorage')
    }
  }, [cachedReservaId])

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

  // Mostrar error de sistema con SweetAlert
  const showSystemError = () => {
    Swal.fire({
      icon: 'error',
      title: '❌ Error del sistema',
      html: `
        <p>Ha ocurrido un error al procesar tu solicitud.</p>
        <p style="margin-top: 15px;"><strong>Por favor, llámanos para hacer tu reserva:</strong></p>
        <p style="font-size: 1.5rem; margin-top: 10px;">📞 <a href="tel:630713713" style="color: #c4b5a4; text-decoration: none;">630 713 713</a></p>
      `,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#c4b5a4',
      background: '#2a2a2a',
      color: '#ffffff'
    })
  }

  // Mostrar respuesta del servidor con SweetAlert
  const showServerResponse = (type, title, message) => {
    Swal.fire({
      icon: type,
      title: title,
      html: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#c4b5a4',
      background: '#2a2a2a',
      color: '#ffffff',
      timer: type === 'success' ? 8000 : undefined,
      timerProgressBar: type === 'success'
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

  // ACTUALIZADO: Usa el nuevo sistema de configuración con excepciones
  const getAvailableHours = (dateString) => {
    if (!dateString) return []
    const day = getDayOfWeek(dateString)
    return obtenerHorariosValidos(day, dateString)
  }

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
      
      // ACTUALIZADO: Usar el nuevo sistema de excepciones
      const day = getDayOfWeek(value)
      if (estaDiaCerrado(day, value)) {
        const mensaje = obtenerMensajeFecha(day, value)
        setMensajeReserva(mensaje)
        setTimeout(() => setMensajeReserva(''), 4000)
        return
      }
      
      // Mostrar mensaje informativo si aplica (solo mediodía, cena especial, etc.)
      const mensajeInfo = obtenerMensajeFecha(day, value)
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
    
    // ACTUALIZADO: Usar el nuevo sistema de excepciones
    const day = getDayOfWeek(reserva.fecha)
    if (estaDiaCerrado(day, reserva.fecha)) {
      const mensaje = obtenerMensajeFecha(day, reserva.fecha)
      setMensajeReserva(mensaje)
      return
    }

    const [year, month, dayNum] = reserva.fecha.split('-')
    const fechaFormateada = `${dayNum}/${month}/${year}`
    const telefonoFormateado = reserva.telefono.startsWith('+') ? reserva.telefono : `+${reserva.telefono}`

    // Si ya existe una reserva temporal en cache, mostrar modal directamente
    if (cachedReservaId) {
      console.log('✅ Ya existe reserva temporal con ID:', cachedReservaId)
      console.log('⏩ Mostrando modal sin crear nueva reserva')
      
      setReservaStatus('pending_confirm')
      setPendingReserva({
        nombre: reserva.nombre,
        fecha: reserva.fecha,
        hora: reserva.hora,
        personas: reserva.personas,
        telefono: telefonoFormateado,
        notas: reserva.notas,
        fechaFormateada,
        reserva_id: cachedReservaId
      })
      setShowConfirmModal(true)
      setMensajeReserva('')
      return
    }

    setReservaStatus('loading')
    setMensajeReserva('⏳ Comprobando disponibilidad...')

    try {
      // Primera petición: Consultar disponibilidad
      // Si ya existe un ID cacheado, lo enviamos para actualizar la reserva temporal existente
      const requestBody = {
        reserva_fecha: fechaFormateada,
        reserva_hora: reserva.hora,
        reserva_invitados: parseInt(reserva.personas),
        reserva_telefono: telefonoFormateado,
        nombre: reserva.nombre,
        reserva_notas: reserva.notas || '',
        source: 'web',
        reserva_boolean: false  // Solo consulta, no confirma
      }
      
      // Si hay un ID cacheado, lo enviamos para reutilizar la reserva temporal
      if (cachedReservaId) {
        requestBody.reserva_id = cachedReservaId
        console.log('📌 Reutilizando ID temporal de localStorage:', cachedReservaId)
      }
      
      // Usar fetchWithTimeout para timeout de 10 segundos
      const response = await fetchWithTimeout(import.meta.env.VITE_WEBHOOK_RESERVAS, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_JWT_SECRET}`
        },
        body: JSON.stringify(requestBody)
      })
      
      // Verificar que hay respuesta
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('=== RESPUESTA CONSULTA DISPONIBILIDAD (reserva_boolean: false) ===')
      console.log('Data completa:', JSON.stringify(data, null, 2))
      
      const result = data.results?.[0] || data
      const resultText = result.result || result.message || ''
      const disponibilidad = result.disponibilidad || result.status || ''
      const reservaIdRecibido = result.reserva_id || result.id || null
      
      console.log('Result:', result)
      console.log('ResultText:', resultText)
      console.log('Disponibilidad:', disponibilidad)
      console.log('ID temporal recibido:', reservaIdRecibido)

      // IMPORTANTE: Esta es SOLO consulta de disponibilidad, NO confirmación
      // n8n debe devolver el ID de la reserva temporal
      if (disponibilidad === 'Disponible' || resultText.toLowerCase().includes('disponible') || resultText.toLowerCase().includes('temporal')) {
        // Extraer ID de reserva temporal (o usar el cacheado si ya existe)
        const idMatch = resultText.match(/(?:RESERVA_ID|ID)[=:\s]*([^\s.,]+)/i) || 
                       resultText.match(/\b(\d+)\b/)
        const newReservaId = idMatch ? idMatch[1] : reservaIdRecibido
        
        // Usar el ID cacheado si existe, sino usar el nuevo
        const tempReservaId = cachedReservaId || newReservaId
        
        if (!tempReservaId) {
          console.error('❌ No se recibió ID de reserva temporal')
          setReservaStatus('error')
          setMensajeReserva('⚠️ Error: No se recibió ID de reserva. Intenta de nuevo.')
          return
        }
        
        // Guardar en cache para futuras consultas
        if (!cachedReservaId && newReservaId) {
          setCachedReservaId(newReservaId)
          console.log('💾 ID temporal guardado en cache:', newReservaId)
        }
        
        console.log('✅ DISPONIBILIDAD CONFIRMADA - ID temporal:', tempReservaId)
        console.log('📋 Mostrando modal para que usuario confirme...')
        
        // Guardar datos pendientes para la confirmación
        setPendingReserva({
          reserva_id: tempReservaId,
          fecha: reserva.fecha,
          fechaFormateada,
          hora: reserva.hora,
          personas: reserva.personas,
          nombre: reserva.nombre,
          telefono: telefonoFormateado,
          notas: reserva.notas || ''
        })
        
        setReservaStatus('pending_confirm')
        setMensajeReserva('')
        setShowConfirmModal(true)
        
        console.log('✅ Modal activado. showConfirmModal = true')

      } else if (resultText.includes('pero tenemos huecos') || resultText.includes('alternativas') || disponibilidad === 'Alternativas') {
        const altArray = result.alternativas || []
        if (altArray.length > 0) {
          setAlternativas(altArray)
        } else {
          const horasMatch = resultText.match(/a las ([0-9:,\s]+)/i)
          if (horasMatch) {
            const horas = horasMatch[1].split(',').map(h => h.trim()).filter(h => h)
            setAlternativas(horas)
          }
        }
        setReservaStatus('alternatives')
        setMensajeReserva(`⚠️ No hay disponibilidad a las ${reserva.hora}`)

      } else if (resultText.includes('No hay disponibilidad') || disponibilidad === 'No Disponible') {
        setReservaStatus('full')
        setMensajeReserva('❌ Lo sentimos, no hay disponibilidad para este día. Prueba con otra fecha.')

      } else {
        setReservaStatus('error')
        setMensajeReserva('⚠️ Error al procesar la reserva. Intenta de nuevo o llámanos.')
      }

    } catch (error) {
      console.error('Error al conectar con el servidor:', error)
      setReservaStatus('error')
      
      if (error.message === 'TIMEOUT') {
        setMensajeReserva('⏱️ El servidor no responde. Por favor, llámanos.')
        showSystemError()
      } else {
        setMensajeReserva('❌ Error de conexión. Por favor, llámanos al 630 713 713.')
        showSystemError()
      }
    }
  }

  // PASO 2: Confirmar reserva definitivamente (cambiar de TEMPORAL a CONFIRMADO)
  const confirmarReserva = async () => {
    if (!pendingReserva) return
    
    console.log('=== CONFIRMANDO RESERVA (reserva_boolean: true) ===')
    console.log('Datos a enviar:', pendingReserva)
    
    setShowConfirmModal(false)
    setReservaStatus('loading')
    setMensajeReserva('⏳ Confirmando tu reserva...')

    try {
      // Segunda petición: Confirmar la reserva temporal → estado CONFIRMADO
      // Usar fetchWithTimeout para timeout de 10 segundos
      const response = await fetchWithTimeout(import.meta.env.VITE_WEBHOOK_RESERVAS, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_JWT_SECRET}`
        },
        body: JSON.stringify({
          reserva_fecha: pendingReserva.fechaFormateada,
          reserva_hora: pendingReserva.hora,
          reserva_invitados: parseInt(pendingReserva.personas),
          reserva_telefono: pendingReserva.telefono,
          nombre: pendingReserva.nombre,
          reserva_notas: pendingReserva.notas || '',
          reserva_id: pendingReserva.reserva_id,  // IMPORTANTE: Mismo ID
          source: 'web',
          reserva_boolean: true  // ✅ CONFIRMAR DEFINITIVAMENTE
        })
      })

      // Verificar que la petición fue exitosa
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Leer respuesta como texto primero
      const responseText = await response.text()
      console.log('=== RESPUESTA CONFIRMACIÓN (raw) ===')
      console.log('Response text:', responseText)
      
      if (!responseText || !responseText.trim()) {
        throw new Error('Respuesta vacía del servidor')
      }

      // Parsear JSON
      let data = null
      let confirmMessage = ''
      
      try {
        data = JSON.parse(responseText)
        console.log('Data parsed:', data)
        
        // Extraer mensaje del body si es respuesta de Twilio
        if (Array.isArray(data) && data[0]?.body) {
          confirmMessage = data[0].body
        } else if (data.body) {
          confirmMessage = data.body
        } else if (data.message) {
          confirmMessage = data.message
        } else if (data.result) {
          confirmMessage = data.result
        }
      } catch (parseError) {
        console.log('Respuesta no es JSON, usando como texto')
        confirmMessage = responseText
      }

      // Éxito - Mostrar SweetAlert con el mensaje del servidor
      setReservaId(pendingReserva.reserva_id)
      setReservaStatus('success')
      setMensajeReserva('✅ ¡Reserva confirmada!')
      
      console.log('✅ Reserva confirmada definitivamente. ID:', pendingReserva.reserva_id)
      
      // Mostrar modal de éxito con SweetAlert
      Swal.fire({
        icon: 'success',
        title: '🎉 ¡Reserva confirmada!',
        html: confirmMessage 
          ? `<div style="text-align: left; white-space: pre-wrap; font-size: 0.95rem;">${confirmMessage}</div>`
          : `<p>Tu reserva ha sido confirmada correctamente.</p>
             <p style="margin-top: 10px;"><strong>ID de reserva:</strong> ${pendingReserva.reserva_id}</p>
             <p style="margin-top: 10px;">Recibirás un WhatsApp de confirmación en breve.</p>`,
        confirmButtonText: '¡Genial!',
        confirmButtonColor: '#c4b5a4',
        background: '#2a2a2a',
        color: '#ffffff',
        timer: 15000,
        timerProgressBar: true
      })
      
      // Limpiar cache y formulario después de 3 segundos
      setTimeout(() => {
        setReserva({ nombre: '', telefono: '', fecha: '', hora: '', personas: '', notas: '' })
        setReservaStatus('idle')
        setMensajeReserva('')
        setReservaId(null)
        setPendingReserva(null)
        setCachedReservaId(null)  // Limpiar cache al confirmar exitosamente
      }, 3000)

    } catch (error) {
      console.error('❌ Error al confirmar reserva:', error)
      setReservaStatus('error')
      
      if (error.message === 'TIMEOUT') {
        setMensajeReserva('⏱️ El servidor no responde.')
        showSystemError()
      } else if (error.message.includes('vacía')) {
        setMensajeReserva('⚠️ No se recibió respuesta del servidor.')
        showSystemError()
      } else {
        setMensajeReserva('❌ Error al confirmar. Por favor, llámanos.')
        showSystemError()
      }
    }
  }

  // Cancelar confirmación (mantiene el ID cacheado para reutilizar)
  const cancelarConfirmacion = () => {
    setShowConfirmModal(false)
    setPendingReserva(null)
    setReservaStatus('idle')
    // NO limpiamos cachedReservaId aquí para poder reutilizarlo
    setMensajeReserva('ℹ️ Reserva en pausa. Tu mesa temporal sigue reservada.')
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
              📅 Reservas hasta 30 días de antelación. Los miércoles estamos cerrados.
            </small>
          </div>
          <div className="form-group">
            <label>Hora:</label>
            <select 
              name="hora" 
              value={reserva.hora}
              onChange={handleReservaChange}
              required
              disabled={!reserva.fecha || getAvailableHours(reserva.fecha).length === 0}
            >
              <option value="">-- : --</option>
              {getAvailableHours(reserva.fecha).map(hora => (
                <option key={hora} value={hora}>{hora}</option>
              ))}
            </select>
            {reserva.fecha && getDayOfWeek(reserva.fecha) === 3 && (
              <span className="error-msg">Los miércoles estamos cerrados</span>
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
