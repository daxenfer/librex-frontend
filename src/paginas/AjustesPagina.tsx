import { useState, useEffect } from 'react'
import { settingsService, type CompanySettingsDto } from '../servicios/settingsServicio'

const MAX_LOGO_BYTES = 500 * 1024 // ~500 KB

const emptySettings: CompanySettingsDto = {
  companyName: '',
  brandName: '',
  rfc: '',
  phone1: '',
  phone2: '',
  email: '',
  address: '',
  postalCode: '',
  city: '',
  state: '',
  logoBase64: '',
}

export function SettingsPage() {
  const [form, setForm] = useState<CompanySettingsDto>(emptySettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    settingsService.get()
      .then(s => setForm({ ...emptySettings, ...s }))
      .catch(() => setError('No se pudo cargar la configuración.'))
      .finally(() => setLoading(false))
  }, [])

  const update = (field: keyof CompanySettingsDto, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setSuccess(false)
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permitir volver a elegir el mismo archivo
    if (!file) return
    if (file.size > MAX_LOGO_BYTES) {
      setError('La imagen es muy grande (máx. 500 KB). Usa una versión más pequeña del logo.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setForm(prev => ({ ...prev, logoBase64: String(reader.result) }))
      setError(null)
      setSuccess(false)
    }
    reader.onerror = () => setError('No se pudo leer la imagen.')
    reader.readAsDataURL(file)
  }

  const removeLogo = () => {
    setForm(prev => ({ ...prev, logoBase64: '' }))
    setSuccess(false)
  }

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setSaving(true); setError(null); setSuccess(false)
    try {
      const saved = await settingsService.update(form)
      setForm({ ...emptySettings, ...saved })
      setSuccess(true)
    } catch {
      setError('Error al guardar la configuración.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: '2rem' }}>Cargando...</div>

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 900, margin: '0 auto' }}>
      <h4 style={{ color: '#1a1a2e', fontWeight: 700, marginBottom: '1.25rem' }}>Configuración de la empresa</h4>

      {error && <p style={{ color: '#c0392b', marginBottom: '1rem' }}>{error}</p>}
      {success && <p style={{ color: '#27ae60', marginBottom: '1rem' }}>Configuración guardada.</p>}

      <form onSubmit={handleSubmit}>
        {/* ── Logo ── */}
        <div style={card}>
          <h6 style={sectionTitle}>Logo</h6>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={logoPreview}>
              {form.logoBase64
                ? <img src={form.logoBase64} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                : <span style={{ color: '#999', fontSize: '0.8rem' }}>Sin logo</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={btnAdd}>
                {form.logoBase64 ? 'Cambiar logo' : 'Subir logo'}
                <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleLogoChange} style={{ display: 'none' }} />
              </label>
              {form.logoBase64 && (
                <button type="button" onClick={removeLogo} style={btnRemove}>Quitar logo</button>
              )}
              <span style={{ fontSize: '0.78rem', color: '#888' }}>PNG, JPG o SVG. Máx. 500 KB. Se usa en el PDF de la remisión.</span>
            </div>
          </div>
        </div>

        {/* ── Datos de la empresa ── */}
        <div style={{ ...card, marginTop: 12 }}>
          <h6 style={sectionTitle}>Datos de la empresa</h6>
          <div style={row}>
            <div style={field}>
              <label style={labelStyle}>Razón social *</label>
              <input style={input} value={form.companyName} onChange={e => update('companyName', e.target.value)} maxLength={200} required />
            </div>
            <div style={field}>
              <label style={labelStyle}>Nombre comercial *</label>
              <input style={input} value={form.brandName} onChange={e => update('brandName', e.target.value)} maxLength={200} required />
            </div>
          </div>

          <div style={{ ...row, marginTop: 12 }}>
            <div style={field}>
              <label style={labelStyle}>RFC *</label>
              <input style={input} value={form.rfc} onChange={e => update('rfc', e.target.value)} maxLength={20} required />
            </div>
            <div style={field}>
              <label style={labelStyle}>Email</label>
              <input style={input} type="email" value={form.email ?? ''} onChange={e => update('email', e.target.value)} maxLength={200} />
            </div>
          </div>

          <div style={{ ...row, marginTop: 12 }}>
            <div style={field}>
              <label style={labelStyle}>Teléfono 1</label>
              <input style={input} value={form.phone1 ?? ''} onChange={e => update('phone1', e.target.value)} maxLength={50} />
            </div>
            <div style={field}>
              <label style={labelStyle}>Teléfono 2</label>
              <input style={input} value={form.phone2 ?? ''} onChange={e => update('phone2', e.target.value)} maxLength={50} />
            </div>
          </div>

          <div style={{ ...row, marginTop: 12 }}>
            <div style={{ ...field, flex: 2 }}>
              <label style={labelStyle}>Domicilio</label>
              <input style={input} value={form.address ?? ''} onChange={e => update('address', e.target.value)} maxLength={300} />
            </div>
            <div style={{ ...field, maxWidth: 140 }}>
              <label style={labelStyle}>C.P.</label>
              <input style={input} value={form.postalCode ?? ''} onChange={e => update('postalCode', e.target.value)} maxLength={10} />
            </div>
          </div>

          <div style={{ ...row, marginTop: 12 }}>
            <div style={field}>
              <label style={labelStyle}>Ciudad</label>
              <input style={input} value={form.city ?? ''} onChange={e => update('city', e.target.value)} maxLength={100} />
            </div>
            <div style={field}>
              <label style={labelStyle}>Estado</label>
              <input style={input} value={form.state ?? ''} onChange={e => update('state', e.target.value)} maxLength={100} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button type="submit" disabled={saving} style={btnPrimary}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}

const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const sectionTitle: React.CSSProperties = { color: '#1a1a2e', fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }
const row: React.CSSProperties = { display: 'flex', gap: '1rem', flexWrap: 'wrap' }
const field: React.CSSProperties = { flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 4 }
const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: '#555' }
const input: React.CSSProperties = { padding: '0.45rem 0.6rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }
const logoPreview: React.CSSProperties = { width: 160, height: 90, border: '1px dashed #ccc', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa', padding: 6, boxSizing: 'border-box' }
const btnPrimary: React.CSSProperties = { padding: '0.6rem 1.5rem', backgroundColor: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem' }
const btnAdd: React.CSSProperties = { padding: '0.4rem 0.9rem', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'center', display: 'inline-block' }
const btnRemove: React.CSSProperties = { padding: '0.35rem 0.9rem', backgroundColor: '#fff', color: '#c0392b', border: '1px solid #c0392b', borderRadius: '4px', cursor: 'pointer', fontSize: '0.82rem' }
