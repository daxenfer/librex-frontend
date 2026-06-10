import { forwardRef, useEffect, useState } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { es } from 'date-fns/locale'

registerLocale('es', es)

// On small screens open the calendar as a centered modal (better touch UX).
function useIsMobile() {
  const query = '(max-width: 640px)'
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

const pad = (n: number) => String(n).padStart(2, '0')

// 'YYYY-MM-DD' -> Date (local midnight). Avoids timezone day-shift.
function parse(value: string): Date | null {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

// Date -> 'YYYY-MM-DD' using local getters (no toISOString shift).
function format(date: Date | null): string {
  if (!date) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

interface CustomInputProps {
  value?: string
  onClick?: () => void
  disabled?: boolean
  required?: boolean
  id?: string
  placeholder?: string
}

// react-datepicker passes ref + onClick to the custom input. readOnly makes the
// whole field clickable (no typing) so clicking anywhere opens the calendar.
const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
  ({ value, onClick, disabled, required, id, placeholder }, ref) => (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={ref}
        id={id}
        type="text"
        readOnly
        value={value ?? ''}
        onClick={onClick}
        onFocus={onClick}
        disabled={disabled}
        required={required}
        placeholder={placeholder ?? 'dd/mm/aaaa'}
        style={inputStyle}
      />
      <span style={iconStyle}>📅</span>
    </div>
  )
)
CustomInput.displayName = 'DateFieldInput'

interface Props {
  value: string
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  placeholder?: string
  id?: string
}

export function DateField({ value, onChange, required, disabled, minDate, maxDate, placeholder, id }: Props) {
  const isMobile = useIsMobile()
  return (
    <DatePicker
      selected={parse(value)}
      onChange={(date) => onChange(format(date))}
      locale="es"
      dateFormat="dd/MM/yyyy"
      minDate={minDate}
      maxDate={maxDate}
      disabled={disabled}
      calendarStartDay={1}
      todayButton="Hoy"
      showPopperArrow={false}
      popperPlacement="bottom-start"
      withPortal={isMobile}
      wrapperClassName="datefield-wrapper"
      customInput={<CustomInput required={required} id={id} placeholder={placeholder} />}
    />
  )
}

const inputStyle: React.CSSProperties = {
  padding: '0.45rem 0.6rem',
  paddingRight: '2rem',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontSize: '0.9rem',
  width: '100%',
  boxSizing: 'border-box',
  cursor: 'pointer',
  backgroundColor: '#fff',
}

const iconStyle: React.CSSProperties = {
  position: 'absolute',
  right: 8,
  top: '50%',
  transform: 'translateY(-50%)',
  fontSize: '0.9rem',
  pointerEvents: 'none',
}
