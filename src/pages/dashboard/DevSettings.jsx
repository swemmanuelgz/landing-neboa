import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import './DevSettings.css'

export default function DevSettings() {
  const [phones, setPhones] = useState([])
  const [loading, setLoading] = useState(true)
  const [newPhone, setNewPhone] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editPhone, setEditPhone] = useState('')
  const [editLabel, setEditLabel] = useState('')

  const fetchPhones = async () => {
    setLoading(true)
    const { data } = await supabase.from('test_phones').select('*').order('created_at')
    setPhones(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchPhones() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newPhone.trim()) return
    setAdding(true)
    const { error } = await supabase
      .from('test_phones')
      .insert({ phone: newPhone.trim(), label: newLabel.trim() || null })
    if (!error) {
      setNewPhone('')
      setNewLabel('')
      await fetchPhones()
    }
    setAdding(false)
  }

  const handleEdit = (p) => {
    setEditingId(p.id)
    setEditPhone(p.phone)
    setEditLabel(p.label ?? '')
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditPhone('')
    setEditLabel('')
  }

  const handleEditSave = async (id) => {
    if (!editPhone.trim()) return
    const { error } = await supabase
      .from('test_phones')
      .update({ phone: editPhone.trim(), label: editLabel.trim() || null })
      .eq('id', id)
    if (!error) {
      await fetchPhones()
      setEditingId(null)
      setEditPhone('')
      setEditLabel('')
    }
  }

  const handleDelete = async (id, phone) => {
    if (!window.confirm(`¿Eliminar el número ${phone} de la lista de pruebas?`)) return
    await supabase.from('test_phones').delete().eq('id', id)
    setPhones(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="dev-settings-dash">
      <div className="dash-page-header">
        <h1>Configuración dev</h1>
      </div>

      <section className="dev-settings-section">
        <h2 className="dev-settings-section-title">Teléfonos de prueba</h2>
        <p className="dev-settings-desc">
          Los números en esta lista se excluyen de las estadísticas: Top clientes, Top teléfonos por coste. También se excluyen reservas sin teléfono o con las palabras "test" o "prueba" en las notas.
        </p>

        <form className="dev-settings-form" onSubmit={handleAdd}>
          <input
            type="tel"
            className="dash-input"
            value={newPhone}
            onChange={e => setNewPhone(e.target.value)}
            placeholder="+34600000000"
            required
          />
          <input
            type="text"
            className="dash-input dev-settings-label-input"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Etiqueta (opcional)"
          />
          <button type="submit" className="dash-btn-primary" disabled={adding}>
            {adding ? 'Añadiendo...' : 'Añadir'}
          </button>
        </form>

        {loading ? (
          <div className="dash-loading">Cargando...</div>
        ) : phones.length === 0 ? (
          <div className="dash-empty">No hay teléfonos de prueba registrados.</div>
        ) : (
          <div className="dev-phones-list">
            {phones.map(p => (
              <div key={p.id} className={`dev-phone-row${editingId === p.id ? ' dev-phone-edit-row' : ''}`}>
                {editingId === p.id ? (
                  <>
                    <input
                      type="tel"
                      className="dash-input"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                      placeholder="+34600000000"
                    />
                    <input
                      type="text"
                      className="dash-input"
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      placeholder="Etiqueta (opcional)"
                    />
                    <button
                      className="dash-btn-primary"
                      type="button"
                      onClick={() => handleEditSave(p.id)}
                    >
                      Guardar
                    </button>
                    <button
                      className="dash-btn-outline"
                      type="button"
                      onClick={handleEditCancel}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="dev-phone-number">{p.phone}</span>
                    {p.label && <span className="dev-phone-label">{p.label}</span>}
                    <button
                      className="dash-btn-outline dev-phone-edit"
                      type="button"
                      onClick={() => handleEdit(p)}
                    >
                      Editar
                    </button>
                    <button
                      className="dash-btn-danger dev-phone-delete"
                      type="button"
                      onClick={() => handleDelete(p.id, p.phone)}
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
