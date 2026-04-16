import { useState, useEffect } from 'react'
import {
  BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, ComposedChart,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import './Estadisticas.css'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const PIE_COLORS = {
  confirmada: '#66bb6a',
  temporal: '#ff9800',
  cancelada: '#ef5350',
  pasado: '#2e7d32',
  no_show: 'rgba(255,255,255,0.3)',
}

const MOTIVO_LABELS = {
  'customer-ended-call': 'Cliente colgó',
  'assistant-forwarded-call': 'Redirigida',
  'assistant-ended-call': 'Asistente finalizó',
  'silence-timed-out': 'Silencio',
  'customer-ended-call-before-warm-transfer': 'Colgó antes de transfer',
  'call.in-progress.error-transfer-failed': 'Error transferencia',
  'call.in-progress.twilio-completed-call': 'Completada',
  'twilio-reported-customer-misdialed': 'Número equivocado',
  'exceeded-max-duration': 'Duración máx.',
}

const traducirMotivo = (m) => MOTIVO_LABELS[m] ?? (m ? m.replace('call.in-progress.', '') : 'Sin motivo')

const tooltipStyle = {
  contentStyle: {
    background: '#3a3a3a',
    border: '1px solid rgba(196,181,164,0.2)',
    borderRadius: 6,
    color: '#fff',
    fontSize: 12,
  },
  cursor: { fill: 'rgba(196,181,164,0.05)' },
}

const Estadisticas = () => {
  const [period, setPeriod] = useState('mes')
  const [loading, setLoading] = useState(true)
  const [testPhones, setTestPhones] = useState(new Set())

  // Raw data
  const [allReservas, setAllReservas] = useState([])
  const [allLlamadas, setAllLlamadas] = useState([])

  // Reservas date filters
  const [reservasDesde, setReservasDesde] = useState('')
  const [reservasHasta, setReservasHasta] = useState('')

  // Llamadas date filters
  const [llamadasDesde, setLlamadasDesde] = useState('')
  const [llamadasHasta, setLlamadasHasta] = useState('')

  // Reservas computed stats
  const [monthlyData, setMonthlyData] = useState([])
  const [weeklyData, setWeeklyData] = useState([])
  const [dailyData, setDailyData] = useState([])
  const [byDay, setByDay] = useState([])
  const [byHour, setByHour] = useState([])
  const [byStatus, setByStatus] = useState([])

  // Llamadas computed stats
  const [llamadasKPIs, setLlamadasKPIs] = useState({ total: 0, duracionMedia: 0, costeTotal: 0, tasaRedireccion: 0 })
  const [byMotivo, setByMotivo] = useState([])
  const [topTelefonos, setTopTelefonos] = useState([])
  const [costeByMotivo, setCosteByMotivo] = useState([])

  // Initial fetch — load all data once
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [{ data: reservas }, { data: llamadas }] = await Promise.all([
          supabase.from('reservas').select('fecha, hora, invitados, estado').neq('estado', 'temporal'),
          supabase.from('llamadas').select('motivo_finalizacion, duracion, coste, telefono, fecha'),
        ])
        setAllReservas(reservas ?? [])
        setAllLlamadas(llamadas ?? [])
        supabase.from('test_phones').select('phone').then(({ data }) => {
          if (data) setTestPhones(new Set(data.map(r => r.phone)))
        })
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  // Reservas stats — recompute whenever raw data or filters change
  useEffect(() => {
    const filtered = allReservas.filter(r => {
      if (!r.fecha) return true
      if (reservasDesde && r.fecha < reservasDesde) return false
      if (reservasHasta && r.fecha > reservasHasta) return false
      return true
    })

    // Monthly data — respect date filters or default to last 12 months
    const monthMap = {}
    const today = new Date()
    let monthStart, monthEnd
    if (reservasDesde || reservasHasta) {
      monthStart = reservasDesde ? new Date(reservasDesde + 'T00:00:00') : new Date(today.getFullYear(), today.getMonth() - 11, 1)
      monthEnd = reservasHasta ? new Date(reservasHasta + 'T00:00:00') : today
    } else {
      monthEnd = today
      monthStart = new Date(today.getFullYear(), today.getMonth() - 11, 1)
    }
    for (let d = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1); d <= monthEnd; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap[key] = { mes: `${MESES[d.getMonth()]} ${d.getFullYear() !== today.getFullYear() ? d.getFullYear() : ''}`.trim(), reservas: 0, comensales: 0 }
    }
    filtered.forEach(r => {
      if (!r.fecha) return
      const key = r.fecha.slice(0, 7)
      if (monthMap[key]) {
        monthMap[key].reservas += 1
        monthMap[key].comensales += r.invitados ?? 0
      }
    })
    setMonthlyData(Object.values(monthMap))

    // Weekly data — respect date filters or default to last 12 weeks
    const weekMap = {}
    const getMonday = (d) => {
      const day = d.getDay() || 7
      const mon = new Date(d)
      mon.setDate(d.getDate() - (day - 1))
      mon.setHours(0, 0, 0, 0)
      return mon
    }
    const getWeekKey = (d) => {
      const year = d.getFullYear()
      const jan4 = new Date(year, 0, 4)
      const soy = new Date(jan4)
      soy.setDate(jan4.getDate() - ((jan4.getDay() || 7) - 1))
      const weekNum = Math.round((d - soy) / (7 * 24 * 60 * 60 * 1000)) + 1
      return `${year}-W${String(weekNum).padStart(2, '0')}`
    }
    const todayForWeek = new Date()
    const currentMonday = getMonday(todayForWeek)
    let weekStart, weekEnd
    if (reservasDesde || reservasHasta) {
      weekStart = reservasDesde ? getMonday(new Date(reservasDesde + 'T00:00:00')) : new Date(currentMonday.getTime() - 11 * 7 * 86400000)
      weekEnd = reservasHasta ? getMonday(new Date(reservasHasta + 'T00:00:00')) : currentMonday
    } else {
      weekEnd = currentMonday
      weekStart = new Date(currentMonday.getTime() - 11 * 7 * 86400000)
    }
    for (let mon = new Date(weekStart); mon <= weekEnd; mon.setDate(mon.getDate() + 7)) {
      const key = getWeekKey(mon)
      const label = `${mon.getDate()} ${MESES[mon.getMonth()]}`
      weekMap[key] = { label, reservas: 0, comensales: 0, _monday: mon.toISOString().slice(0, 10) }
    }
    filtered.forEach(r => {
      if (!r.fecha) return
      const d = new Date(r.fecha + 'T00:00:00')
      const key = getWeekKey(d)
      if (weekMap[key]) {
        weekMap[key].reservas += 1
        weekMap[key].comensales += r.invitados ?? 0
      }
    })
    setWeeklyData(Object.values(weekMap))

    // Daily data — respect date filters or default to last 30 days
    const dayMapDaily = {}
    const todayForDaily = new Date()
    todayForDaily.setHours(0, 0, 0, 0)
    let dailyStart, dailyEnd
    if (reservasDesde || reservasHasta) {
      dailyStart = reservasDesde ? new Date(reservasDesde + 'T00:00:00') : new Date(todayForDaily.getTime() - 29 * 86400000)
      dailyEnd = reservasHasta ? new Date(reservasHasta + 'T00:00:00') : todayForDaily
    } else {
      dailyEnd = todayForDaily
      dailyStart = new Date(todayForDaily.getTime() - 29 * 86400000)
    }
    for (let d = new Date(dailyStart); d <= dailyEnd; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10)
      const label = `${d.getDate()} ${MESES[d.getMonth()]}`
      dayMapDaily[key] = { label, reservas: 0, comensales: 0 }
    }
    filtered.forEach(r => {
      if (!r.fecha) return
      const key = r.fecha.slice(0, 10)
      if (dayMapDaily[key]) {
        dayMapDaily[key].reservas += 1
        dayMapDaily[key].comensales += r.invitados ?? 0
      }
    })
    setDailyData(Object.values(dayMapDaily))

    // By day of week
    const dayMap = DIAS.map((d, i) => ({ dia: d, comensales: 0, reservas: 0, _dow: i }))
    filtered.forEach(r => {
      if (!r.fecha) return
      const dow = new Date(r.fecha + 'T00:00:00').getDay()
      dayMap[dow].reservas += 1
      dayMap[dow].comensales += r.invitados ?? 0
    })
    setByDay(dayMap)

    // By hour (top 8)
    const hourMap = {}
    filtered.forEach(r => {
      if (!r.hora) return
      const h = r.hora.slice(0, 5)
      hourMap[h] = (hourMap[h] ?? 0) + 1
    })
    const hourArr = Object.entries(hourMap)
      .map(([hora, count]) => ({ hora, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
    setByHour(hourArr)

    // By status
    const statusMap = {}
    filtered.forEach(r => {
      statusMap[r.estado] = (statusMap[r.estado] ?? 0) + 1
    })
    setByStatus(Object.entries(statusMap).map(([name, value]) => ({ name, value })))
  }, [allReservas, reservasDesde, reservasHasta])

  // Llamadas stats — recompute whenever raw data or filters change
  useEffect(() => {
    const filtered = allLlamadas.filter(l => {
      if (!l.fecha) return true
      if (llamadasDesde && l.fecha < llamadasDesde) return false
      if (llamadasHasta && l.fecha > llamadasHasta) return false
      return true
    })

    if (filtered.length === 0) {
      setLlamadasKPIs({ total: 0, duracionMedia: 0, costeTotal: 0, tasaRedireccion: 0 })
      setByMotivo([])
      setTopTelefonos([])
      setCosteByMotivo([])
      return
    }

    const total = filtered.length
    const duracionMedia = filtered.reduce((sum, l) => sum + (l.duracion ?? 0), 0) / total
    const costeTotal = filtered.reduce((sum, l) => sum + (l.coste ?? 0), 0)
    const redirigidas = filtered.filter(l => l.motivo_finalizacion === 'assistant-forwarded-call').length
    const tasaRedireccion = total > 0 ? (redirigidas / total) * 100 : 0
    setLlamadasKPIs({ total, duracionMedia, costeTotal, tasaRedireccion })

    // By motivo
    const motivoMap = {}
    filtered.forEach(l => {
      const m = l.motivo_finalizacion ?? null
      const key = m ?? '__null__'
      motivoMap[key] = (motivoMap[key] ?? 0) + 1
    })
    const motivoArr = Object.entries(motivoMap)
      .map(([key, count]) => ({
        motivo: traducirMotivo(key === '__null__' ? null : key),
        llamadas: count,
      }))
      .sort((a, b) => b.llamadas - a.llamadas)
      .slice(0, 8)
    setByMotivo(motivoArr)

    // Top telefonos by coste
    const telefonoMap = {}
    filtered.forEach(l => {
      if (!l.telefono) return
      if (testPhones.has(l.telefono)) return
      telefonoMap[l.telefono] = (telefonoMap[l.telefono] ?? 0) + (l.coste ?? 0)
    })
    const telefonoArr = Object.entries(telefonoMap)
      .map(([telefono, coste]) => ({ telefono, coste: Math.round(coste * 100) / 100 }))
      .sort((a, b) => b.coste - a.coste)
      .slice(0, 8)
    setTopTelefonos(telefonoArr)

    // Coste by motivo (top 6)
    const costeMotivoMap = {}
    filtered.forEach(l => {
      const m = l.motivo_finalizacion ?? null
      const key = m ?? '__null__'
      costeMotivoMap[key] = (costeMotivoMap[key] ?? 0) + (l.coste ?? 0)
    })
    const costeMotivoArr = Object.entries(costeMotivoMap)
      .map(([key, coste]) => ({
        motivo: traducirMotivo(key === '__null__' ? null : key),
        coste: Math.round(coste * 100) / 100,
      }))
      .sort((a, b) => b.coste - a.coste)
      .slice(0, 6)
    setCosteByMotivo(costeMotivoArr)
  }, [allLlamadas, llamadasDesde, llamadasHasta, testPhones])

  const formatDuracion = (segundos) => {
    const m = Math.floor(segundos / 60)
    const s = Math.round(segundos % 60)
    return `${m}m ${s}s`
  }

  if (loading) {
    return <div className="dash-loading" style={{ padding: '80px 0' }}>Cargando estadísticas...</div>
  }

  return (
    <div className="estadisticas-dash">
      <div className="dash-page-header">
        <h1>Estadísticas</h1>
      </div>

      <div className="stats-filter-row">
        <label className="dash-filter-label">
          Desde
          <input
            type="date"
            className="dash-input"
            value={reservasDesde}
            onChange={e => setReservasDesde(e.target.value)}
          />
        </label>
        <label className="dash-filter-label">
          Hasta
          <input
            type="date"
            className="dash-input"
            value={reservasHasta}
            onChange={e => setReservasHasta(e.target.value)}
          />
        </label>
        {(reservasDesde || reservasHasta) && (
          <button
            className="dash-btn-outline"
            onClick={() => { setReservasDesde(''); setReservasHasta('') }}
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="stats-card stats-card--large">
        <div className="stats-card-header">
          <h2>
            {period === 'mes' ? 'Reservas por mes' : period === 'semana' ? 'Reservas por semana' : 'Reservas por día'}
          </h2>
          <div className="stats-period-tabs">
            {[
              { key: 'mes', label: 'Mes' },
              { key: 'semana', label: 'Semana' },
              { key: 'dia', label: 'Día' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`stats-period-tab${period === key ? ' stats-period-tab--active' : ''}`}
                onClick={() => setPeriod(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart
            data={period === 'mes' ? monthlyData : period === 'semana' ? weeklyData : dailyData}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey={period === 'mes' ? 'mes' : 'label'}
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={tooltipStyle.contentStyle} cursor={tooltipStyle.cursor} />
            <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="reservas" name="Reservas" fill="#c4b5a4" radius={[3, 3, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="comensales" name="Comensales" stroke="#d4c5b4" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="stats-grid-3">
        <div className="stats-card">
          <h2>Por día de la semana</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byDay} layout="vertical" margin={{ top: 0, right: 10, left: 24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="dia" type="category" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle.contentStyle} />
              <Bar dataKey="reservas" fill="#c4b5a4" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="stats-card">
          <h2>Horas más solicitadas</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byHour} layout="vertical" margin={{ top: 0, right: 10, left: 32, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="hora" type="category" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle.contentStyle} />
              <Bar dataKey="count" name="Reservas" fill="#c4b5a4" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="stats-card">
          <h2>Estado de reservas</h2>
          {byStatus.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={byStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {byStatus.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name] ?? '#c4b5a4'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle.contentStyle} />
                  <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <p className="stats-cancel-ratio">
                Ratio de cancelación:{' '}
                <strong>
                  {(() => {
                    const total = byStatus.reduce((s, e) => s + e.value, 0)
                    const canceladas = byStatus.find(e => e.name === 'cancelada')?.value ?? 0
                    return total > 0 ? ((canceladas / total) * 100).toFixed(1) : '0.0'
                  })()}%
                </strong>
              </p>
            </>
          ) : (
            <div className="dash-empty" style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Sin datos
            </div>
          )}
        </div>
      </div>

      <div className="dash-section-separator" />
      <div className="stats-section-title">Estadísticas de Llamadas</div>

      <div className="stats-filter-row">
        <label className="dash-filter-label">
          Desde
          <input
            type="date"
            className="dash-input"
            value={llamadasDesde}
            onChange={e => setLlamadasDesde(e.target.value)}
          />
        </label>
        <label className="dash-filter-label">
          Hasta
          <input
            type="date"
            className="dash-input"
            value={llamadasHasta}
            onChange={e => setLlamadasHasta(e.target.value)}
          />
        </label>
        {(llamadasDesde || llamadasHasta) && (
          <button
            className="dash-btn-outline"
            onClick={() => { setLlamadasDesde(''); setLlamadasHasta('') }}
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="stats-kpi-row">
        <div className="stats-kpi-card">
          <p className="stats-kpi-label">Total llamadas</p>
          <p className="stats-kpi-value">{llamadasKPIs.total}</p>
        </div>
        <div className="stats-kpi-card">
          <p className="stats-kpi-label">Duración media</p>
          <p className="stats-kpi-value">{formatDuracion(llamadasKPIs.duracionMedia)}</p>
        </div>
        <div className="stats-kpi-card">
          <p className="stats-kpi-label">Coste total</p>
          <p className="stats-kpi-value stats-kpi-value--accent">€{llamadasKPIs.costeTotal.toFixed(2)}</p>
        </div>
        <div className="stats-kpi-card">
          <p className="stats-kpi-label">Tasa de redirección</p>
          <p className="stats-kpi-value">{llamadasKPIs.tasaRedireccion.toFixed(1)}%</p>
        </div>
      </div>

      <div className="stats-card stats-card--large">
        <h2>Llamadas por motivo de finalización</h2>
        <div className="stats-chart-scroll">
          <div style={{ minWidth: 380 }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byMotivo} layout="vertical" margin={{ top: 0, right: 20, left: 160, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  dataKey="motivo"
                  type="category"
                  tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={155}
                />
                <Tooltip contentStyle={tooltipStyle.contentStyle} cursor={tooltipStyle.cursor} />
                <Bar dataKey="llamadas" name="Llamadas" fill="#c4b5a4" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="stats-grid-2">
        <div className="stats-card">
          <h2>Top teléfonos por coste</h2>
          <div className="stats-chart-scroll">
            <div style={{ minWidth: 380 }}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topTelefonos} layout="vertical" margin={{ top: 0, right: 20, left: 100, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `€${v.toFixed(2)}`}
                  />
                  <YAxis
                    dataKey="telefono"
                    type="category"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={95}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle.contentStyle}
                    cursor={tooltipStyle.cursor}
                    formatter={(value) => [`€${value.toFixed(2)}`, 'Coste']}
                  />
                  <Bar dataKey="coste" name="Coste" fill="#e8d5c0" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stats-card">
          <h2>Coste por motivo</h2>
          <div className="stats-chart-scroll">
            <div style={{ minWidth: 380 }}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={costeByMotivo} layout="vertical" margin={{ top: 0, right: 20, left: 160, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `€${v.toFixed(2)}`}
                  />
                  <YAxis
                    dataKey="motivo"
                    type="category"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={155}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle.contentStyle}
                    cursor={tooltipStyle.cursor}
                    formatter={(value) => [`€${value.toFixed(2)}`, 'Coste']}
                  />
                  <Bar dataKey="coste" name="Coste" fill="#d4956a" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Estadisticas
