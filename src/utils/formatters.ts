export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function formatPhone(value: string): string {
  const digits = digitsOnly(value).slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function formatZipCode(value: string): string {
  const digits = digitsOnly(value).slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function calculateAge(birthDate: string): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null
  const [year, month, day] = birthDate.split('-').map(Number)
  const today = new Date()
  let age = today.getFullYear() - year
  const monthDiff = today.getMonth() + 1 - month
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age--
  }
  if (age < 0 || age > 120) return null
  return age
}

export function formatDateBR(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [y, m, d] = isoDate.split('-')
    return `${d}/${m}/${y}`
  }
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return isoDate
  return date.toLocaleDateString('pt-BR')
}

export function formatDateTimeBR(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) return '—'
  const date = new Date(isoDateTime)
  if (Number.isNaN(date.getTime())) return isoDateTime
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function buildWhatsAppUrl(phoneDigits: string, message?: string): string {
  const digits = digitsOnly(phoneDigits)
  const fullNumber = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`
  const base = `https://wa.me/${fullNumber}`
  if (!message) return base
  return `${base}?text=${encodeURIComponent(message)}`
}

export interface ViaCepAddress {
  street: string
  neighborhood: string
  city: string
  state: string
}

export async function fetchAddressByZipCode(zipCode: string): Promise<ViaCepAddress | null> {
  const digits = digitsOnly(zipCode)
  if (digits.length !== 8) return null
  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    if (!response.ok) return null
    const data = await response.json()
    if (data.erro) return null
    return {
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: (data.uf || '').toUpperCase(),
    }
  } catch {
    return null
  }
}

export function parseOptionalNumber(raw: string): number | null {
  const normalized = raw.replace(',', '.').trim()
  if (!normalized) return null
  const num = Number(normalized)
  return Number.isFinite(num) ? num : null
}
