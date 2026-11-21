import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Loader2,
  MessageCircle,
  RotateCcw,
  Search,
  Send,
} from 'lucide-react'
import { SignaturePad } from '../components/SignaturePad'
import { YesNoBooleanField, YesNoDetailField } from '../components/YesNoField'
import { ApiError } from '../services/api'
import { fetchCurrentTerms, submitPublicRegistration } from '../services/studentService'
import {
  createDefaultRegistrationPayload,
  FALLBACK_TERMS,
  GENDER_LABELS,
  PRIMARY_GOAL_LABELS,
  SLEEP_QUALITY_LABELS,
  STRESS_LEVEL_LABELS,
  type Gender,
  type PrimaryGoal,
  type PublicRegistrationPayload,
  type PublicRegistrationResponse,
  type SleepQuality,
  type StressLevel,
  type TermsResponse,
} from '../types/anamnesis'
import {
  buildWhatsAppUrl,
  calculateAge,
  digitsOnly,
  fetchAddressByZipCode,
  formatDateBR,
  formatPhone,
  formatZipCode,
  parseOptionalNumber,
} from '../utils/formatters'

const DRAFT_STORAGE_KEY = 'mk_studio_registration_draft_v1'

const STEPS = [
  { number: 1, title: 'Dados Pessoais' },
  { number: 2, title: 'Contato de Emergência' },
  { number: 3, title: 'Histórico Médico e Saúde' },
  { number: 4, title: 'Atividade Física' },
  { number: 5, title: 'Objetivos e Expectativas' },
  { number: 6, title: 'Informações Físicas' },
  { number: 7, title: 'Termo, LGPD e Assinatura' },
] as const

function loadDraft(): PublicRegistrationPayload {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return createDefaultRegistrationPayload()
    const parsed = JSON.parse(raw) as Partial<PublicRegistrationPayload>
    const defaults = createDefaultRegistrationPayload()
    return {
      ...defaults,
      ...parsed,
      personalData: {
        ...defaults.personalData,
        ...parsed.personalData,
        address: {
          ...defaults.personalData.address,
          ...parsed.personalData?.address,
        },
      },
      emergencyContact: { ...defaults.emergencyContact, ...parsed.emergencyContact },
      medicalHistory: {
        currentConditions: {
          ...defaults.medicalHistory.currentConditions,
          ...parsed.medicalHistory?.currentConditions,
        },
        familyHistory: {
          ...defaults.medicalHistory.familyHistory,
          ...parsed.medicalHistory?.familyHistory,
        },
        lifestyleHabits: {
          ...defaults.medicalHistory.lifestyleHabits,
          ...parsed.medicalHistory?.lifestyleHabits,
        },
        injuryHistory: {
          ...defaults.medicalHistory.injuryHistory,
          ...parsed.medicalHistory?.injuryHistory,
        },
        medicationsAndCare: {
          ...defaults.medicalHistory.medicationsAndCare,
          ...parsed.medicalHistory?.medicationsAndCare,
        },
      },
      physicalActivityHistory: {
        ...defaults.physicalActivityHistory,
        ...parsed.physicalActivityHistory,
      },
      goalsAndExpectations: {
        ...defaults.goalsAndExpectations,
        ...parsed.goalsAndExpectations,
      },
      physicalAssessment: {
        ...defaults.physicalAssessment,
        ...parsed.physicalAssessment,
      },
      consent: {
        ...defaults.consent,
        ...parsed.consent,
      },
    }
  } catch {
    return createDefaultRegistrationPayload()
  }
}

export function RegistrationWizardPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<PublicRegistrationPayload>(() => loadDraft())
  const [terms, setTerms] = useState<TermsResponse>(FALLBACK_TERMS)
  const [cepLoading, setCepLoading] = useState(false)
  const [showOptionalMetrics, setShowOptionalMetrics] = useState(false)
  const [stepError, setStepError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState<PublicRegistrationResponse | null>(null)

  useEffect(() => {
    fetchCurrentTerms()
      .then((data) => {
        setTerms(data)
        setForm((prev) => ({
          ...prev,
          consent: { ...prev.consent, termsVersion: data.version },
        }))
      })
      .catch(() => {
        // Fallback terms already loaded
      })
  }, [])

  useEffect(() => {
    if (completed) return
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form))
    } catch {
      // Ignore storage quota errors
    }
  }, [form, completed])

  const computedAge = calculateAge(form.personalData.birthDate)

  async function handleZipCodeLookup(rawZip: string) {
    const formatted = formatZipCode(rawZip)
    setForm((prev) => ({
      ...prev,
      personalData: {
        ...prev.personalData,
        address: { ...prev.personalData.address, zipCode: formatted },
      },
    }))

    if (digitsOnly(formatted).length === 8) {
      setCepLoading(true)
      const found = await fetchAddressByZipCode(formatted)
      setCepLoading(false)
      if (found) {
        setForm((prev) => ({
          ...prev,
          personalData: {
            ...prev.personalData,
            address: {
              ...prev.personalData.address,
              street: found.street || prev.personalData.address.street,
              neighborhood: found.neighborhood || prev.personalData.address.neighborhood,
              city: found.city || prev.personalData.address.city,
              state: found.state || prev.personalData.address.state,
            },
          },
        }))
      }
    }
  }

  function validateStep(currentStep: number): string | null {
    if (currentStep === 1) {
      const p = form.personalData
      if (p.fullName.trim().length < 3) return 'Informe seu nome completo (mínimo 3 caracteres).'
      if (!p.birthDate || calculateAge(p.birthDate) === null) {
        return 'Informe uma data de nascimento válida.'
      }
      const phoneDigits = digitsOnly(p.phone)
      if (phoneDigits.length !== 10 && phoneDigits.length !== 11) {
        return 'Informe um WhatsApp válido com DDD (10 ou 11 dígitos).'
      }
      if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
        return 'Informe um e-mail válido ou deixe o campo em branco.'
      }
      const a = p.address
      if (digitsOnly(a.zipCode).length !== 8) return 'Informe um CEP válido com 8 dígitos.'
      if (!a.street.trim()) return 'Informe o endereço (rua/avenida).'
      if (!a.number.trim()) return 'Informe o número do endereço.'
      if (!a.neighborhood.trim()) return 'Informe o bairro.'
      if (!a.city.trim()) return 'Informe a cidade.'
      if (!/^[A-Za-z]{2}$/.test(a.state.trim())) return 'Informe a sigla do estado (ex.: SP).'
    }

    if (currentStep === 2) {
      const e = form.emergencyContact
      if (e.fullName.trim().length < 2) return 'Informe o nome completo do contato de emergência.'
      if (!e.relationship.trim()) return 'Informe o grau de parentesco do contato de emergência.'
      const phoneDigits = digitsOnly(e.phone)
      if (phoneDigits.length !== 10 && phoneDigits.length !== 11) {
        return 'Informe um telefone de emergência válido com DDD.'
      }
    }

    if (currentStep === 3) {
      const hours = form.medicalHistory.lifestyleHabits.sleepHoursPerNight
      if (Number.isNaN(hours) || hours < 0 || hours > 24) {
        return 'Informe uma quantidade válida de horas de sono por noite.'
      }
    }

    if (currentStep === 5) {
      const g = form.goalsAndExpectations
      if (g.primaryGoal === 'OTHER' && !g.primaryGoalOther?.trim()) {
        return 'Descreva qual é o seu objetivo principal.'
      }
      if (!g.weeklyAvailability.trim()) {
        return 'Informe sua disponibilidade semanal de dias/horários para treinar.'
      }
      if (g.intendedWeeklyFrequency < 1 || g.intendedWeeklyFrequency > 7) {
        return 'Selecione quantas vezes por semana pretende treinar (1 a 7).'
      }
    }

    if (currentStep === 7) {
      const c = form.consent
      if (!c.termsAccepted) return 'Você precisa concordar com o Termo de Responsabilidade.'
      if (!c.lgpdConsentAccepted) return 'Você precisa autorizar o tratamento de dados conforme a LGPD.'
      if (c.signerName.trim().length < 3) return 'Informe o nome completo do assinante.'
      if (!c.signatureImage.startsWith('data:image/')) {
        return 'Faça sua assinatura no quadro antes de finalizar.'
      }
    }

    return null
  }

  function handleNext() {
    const error = validateStep(step)
    if (error) {
      setStepError(error)
      return
    }
    setStepError(null)
    const nextStep = Math.min(STEPS.length, step + 1)
    if (nextStep === 7 && !form.consent.signerName.trim() && form.personalData.fullName.trim()) {
      setForm((prev) => ({
        ...prev,
        consent: { ...prev.consent, signerName: prev.personalData.fullName.trim() },
      }))
    }
    setStep(nextStep)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleBack() {
    setStepError(null)
    setStep((prev) => Math.max(1, prev - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleResetDraft() {
    if (!window.confirm('Deseja limpar todos os campos preenchidos e recomeçar o formulário?')) {
      return
    }
    localStorage.removeItem(DRAFT_STORAGE_KEY)
    setForm(createDefaultRegistrationPayload())
    setStep(1)
    setStepError(null)
  }

  async function handleSubmit() {
    const error = validateStep(7)
    if (error) {
      setStepError(error)
      return
    }

    setStepError(null)
    setSubmitting(true)
    try {
      const result = await submitPublicRegistration(form)
      localStorage.removeItem(DRAFT_STORAGE_KEY)
      setCompleted(result)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      if (err instanceof ApiError) {
        const firstFieldError = err.fieldErrors ? Object.values(err.fieldErrors)[0] : null
        setStepError(firstFieldError || err.message)
      } else {
        setStepError('Não foi possível enviar seu cadastro. Tente novamente em instantes.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (completed) {
    const studioWhatsApp = import.meta.env.VITE_STUDIO_WHATSAPP_NUMBER
    const notifyUrl = studioWhatsApp
      ? buildWhatsAppUrl(
          studioWhatsApp,
          `Olá! Acabei de preencher minha ficha de anamnese online do MK STUDIO (${completed.fullName}).`,
        )
      : null

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Cadastro enviado com sucesso!</h1>
          <p className="mt-2 text-sm text-slate-600">
            Obrigado, <strong>{completed.fullName}</strong>! Sua anamnese já foi registrada com
            segurança no sistema do <strong>MK STUDIO</strong>.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Data de registro: {formatDateBR(completed.signedAt)}
          </p>

          <div className="mt-6 space-y-3">
            {notifyUrl && (
              <a
                href={notifyUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                Avisar o personal no WhatsApp
              </a>
            )}
            <Link
              to="/"
              className="flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const progressPercent = Math.round((step / STEPS.length) * 100)
  const currentStepInfo = STEPS[step - 1]

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Dumbbell className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  ANAMNESE – MK STUDIO
                </p>
                <p className="text-xs text-slate-500">
                  Etapa {step} de {STEPS.length} — {currentStepInfo.title}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetDraft}
              title="Limpar rascunho"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-slate-900 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-6">
        {stepError && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{stepError}</span>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">
            {step}. {currentStepInfo.title}
          </h2>

          {/* STEP 1 — DADOS PESSOAIS */}
          {step === 1 && (
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Nome completo *
                </label>
                <input
                  type="text"
                  value={form.personalData.fullName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      personalData: { ...prev.personalData, fullName: e.target.value },
                    }))
                  }
                  placeholder="Seu nome completo"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Data de nascimento *
                  </label>
                  <input
                    type="date"
                    value={form.personalData.birthDate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        personalData: { ...prev.personalData, birthDate: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Idade</label>
                  <input
                    type="text"
                    readOnly
                    value={computedAge !== null ? `${computedAge} anos` : 'Automática'}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-600"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Sexo *</label>
                  <select
                    value={form.personalData.gender}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        personalData: { ...prev.personalData, gender: e.target.value as Gender },
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  >
                    {(Object.keys(GENDER_LABELS) as Gender[]).map((key) => (
                      <option key={key} value={key}>
                        {GENDER_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={form.personalData.phone}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        personalData: { ...prev.personalData, phone: formatPhone(e.target.value) },
                      }))
                    }
                    placeholder="(11) 99999-8888"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    E-mail (opcional)
                  </label>
                  <input
                    type="email"
                    value={form.personalData.email ?? ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        personalData: {
                          ...prev.personalData,
                          email: e.target.value.trim() ? e.target.value : null,
                        },
                      }))
                    }
                    placeholder="voce@email.com"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Endereço
                </p>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">CEP *</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.personalData.address.zipCode}
                        onChange={(e) => handleZipCodeLookup(e.target.value)}
                        placeholder="00000-000"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-9 text-sm focus:border-slate-900 focus:outline-none"
                      />
                      <div className="pointer-events-none absolute right-3 top-2.5 text-slate-400">
                        {cepLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Endereço (Rua / Avenida) *
                    </label>
                    <input
                      type="text"
                      value={form.personalData.address.street}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          personalData: {
                            ...prev.personalData,
                            address: { ...prev.personalData.address, street: e.target.value },
                          },
                        }))
                      }
                      placeholder="Nome da rua"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Número *
                    </label>
                    <input
                      type="text"
                      value={form.personalData.address.number}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          personalData: {
                            ...prev.personalData,
                            address: { ...prev.personalData.address, number: e.target.value },
                          },
                        }))
                      }
                      placeholder="123"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Complemento (opcional)
                    </label>
                    <input
                      type="text"
                      value={form.personalData.address.complement ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          personalData: {
                            ...prev.personalData,
                            address: {
                              ...prev.personalData.address,
                              complement: e.target.value || null,
                            },
                          },
                        }))
                      }
                      placeholder="Apto, bloco, casa..."
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Bairro *
                    </label>
                    <input
                      type="text"
                      value={form.personalData.address.neighborhood}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          personalData: {
                            ...prev.personalData,
                            address: { ...prev.personalData.address, neighborhood: e.target.value },
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Cidade *
                    </label>
                    <input
                      type="text"
                      value={form.personalData.address.city}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          personalData: {
                            ...prev.personalData,
                            address: { ...prev.personalData.address, city: e.target.value },
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Estado (UF) *
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={form.personalData.address.state}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          personalData: {
                            ...prev.personalData,
                            address: {
                              ...prev.personalData.address,
                              state: e.target.value.toUpperCase(),
                            },
                          },
                        }))
                      }
                      placeholder="SP"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm uppercase focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — CONTATO DE EMERGÊNCIA */}
          {step === 2 && (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-slate-500">
                Informe alguém de confiança para acionarmos caso ocorra qualquer imprevisto durante o
                treino.
              </p>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Nome completo do contato de emergência *
                </label>
                <input
                  type="text"
                  value={form.emergencyContact.fullName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      emergencyContact: { ...prev.emergencyContact, fullName: e.target.value },
                    }))
                  }
                  placeholder="Nome do familiar ou responsável"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Grau de parentesco *
                  </label>
                  <input
                    type="text"
                    value={form.emergencyContact.relationship}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        emergencyContact: {
                          ...prev.emergencyContact,
                          relationship: e.target.value,
                        },
                      }))
                    }
                    placeholder="Ex.: Mãe, Cônjuge, Irmão..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Telefone para contato *
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={form.emergencyContact.phone}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        emergencyContact: {
                          ...prev.emergencyContact,
                          phone: formatPhone(e.target.value),
                        },
                      }))
                    }
                    placeholder="(11) 98888-7777"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — HISTÓRICO MÉDICO E ENTREVISTA DE SAÚDE */}
          {step === 3 && (
            <div className="mt-5 space-y-6">
              <p className="text-sm text-slate-500">
                Responda com sinceridade — essas informações garantem sua segurança durante os
                treinos. Quando marcar <strong>Sim</strong>, você pode detalhar rapidamente.
              </p>

              {/* 3.1 Condições atuais */}
              <section className="space-y-2.5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Condições atuais
                </h3>
                {(
                  [
                    ['diagnosedDisease', 'Você possui alguma doença diagnosticada?'],
                    ['heartProblem', 'Você possui algum problema cardíaco?'],
                    ['bloodPressureIssue', 'Você possui pressão arterial alta ou baixa?'],
                    ['diabetes', 'Você possui diabetes?'],
                    ['respiratoryProblem', 'Você possui problemas respiratórios?'],
                    ['jointProblem', 'Você possui problemas articulares?'],
                    ['spineProblem', 'Você possui problemas na coluna?'],
                    ['frequentPain', 'Você sente dores frequentes?'],
                    ['dizzinessOrFainting', 'Você sente tontura ou desmaios?'],
                    [
                      'shortnessOfBreathDuringExercise',
                      'Você sente falta de ar durante atividades físicas?',
                    ],
                    ['otherHealthCondition', 'Você possui alguma outra condição de saúde?'],
                  ] as const
                ).map(([field, label]) => (
                  <YesNoDetailField
                    key={field}
                    label={label}
                    value={form.medicalHistory.currentConditions[field]}
                    onChange={(next) =>
                      setForm((prev) => ({
                        ...prev,
                        medicalHistory: {
                          ...prev.medicalHistory,
                          currentConditions: {
                            ...prev.medicalHistory.currentConditions,
                            [field]: next,
                          },
                        },
                      }))
                    }
                  />
                ))}
              </section>

              {/* 3.2 Histórico familiar */}
              <section className="space-y-2.5 border-t border-slate-200 pt-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Histórico familiar
                </h3>
                <YesNoBooleanField
                  label="Você possui familiares próximos com histórico de doenças cardíacas?"
                  value={form.medicalHistory.familyHistory.heartDisease}
                  onChange={(next) =>
                    setForm((prev) => ({
                      ...prev,
                      medicalHistory: {
                        ...prev.medicalHistory,
                        familyHistory: { ...prev.medicalHistory.familyHistory, heartDisease: next },
                      },
                    }))
                  }
                />
                <YesNoBooleanField
                  label="Histórico familiar de diabetes?"
                  value={form.medicalHistory.familyHistory.diabetes}
                  onChange={(next) =>
                    setForm((prev) => ({
                      ...prev,
                      medicalHistory: {
                        ...prev.medicalHistory,
                        familyHistory: { ...prev.medicalHistory.familyHistory, diabetes: next },
                      },
                    }))
                  }
                />
                <YesNoBooleanField
                  label="Histórico familiar de hipertensão?"
                  value={form.medicalHistory.familyHistory.hypertension}
                  onChange={(next) =>
                    setForm((prev) => ({
                      ...prev,
                      medicalHistory: {
                        ...prev.medicalHistory,
                        familyHistory: { ...prev.medicalHistory.familyHistory, hypertension: next },
                      },
                    }))
                  }
                />
                <YesNoDetailField
                  label="Histórico familiar de doenças hereditárias?"
                  value={form.medicalHistory.familyHistory.hereditaryDiseases}
                  onChange={(next) =>
                    setForm((prev) => ({
                      ...prev,
                      medicalHistory: {
                        ...prev.medicalHistory,
                        familyHistory: {
                          ...prev.medicalHistory.familyHistory,
                          hereditaryDiseases: next,
                        },
                      },
                    }))
                  }
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Existe algum outro histórico familiar relevante? (opcional)
                  </label>
                  <input
                    type="text"
                    value={form.medicalHistory.familyHistory.otherRelevantHistory ?? ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        medicalHistory: {
                          ...prev.medicalHistory,
                          familyHistory: {
                            ...prev.medicalHistory.familyHistory,
                            otherRelevantHistory: e.target.value || null,
                          },
                        },
                      }))
                    }
                    placeholder="Se houver, informe aqui"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </section>

              {/* 3.3 Hábitos de vida */}
              <section className="space-y-3 border-t border-slate-200 pt-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Hábitos de vida
                </h3>
                <YesNoBooleanField
                  label="Você fuma?"
                  value={form.medicalHistory.lifestyleHabits.smokes}
                  onChange={(next) =>
                    setForm((prev) => ({
                      ...prev,
                      medicalHistory: {
                        ...prev.medicalHistory,
                        lifestyleHabits: { ...prev.medicalHistory.lifestyleHabits, smokes: next },
                      },
                    }))
                  }
                />
                <YesNoBooleanField
                  label="Você já fumou?"
                  value={form.medicalHistory.lifestyleHabits.usedToSmoke}
                  onChange={(next) =>
                    setForm((prev) => ({
                      ...prev,
                      medicalHistory: {
                        ...prev.medicalHistory,
                        lifestyleHabits: {
                          ...prev.medicalHistory.lifestyleHabits,
                          usedToSmoke: next,
                        },
                      },
                    }))
                  }
                />
                <YesNoBooleanField
                  label="Você consome bebidas alcoólicas frequentemente?"
                  value={form.medicalHistory.lifestyleHabits.frequentAlcoholConsumption}
                  onChange={(next) =>
                    setForm((prev) => ({
                      ...prev,
                      medicalHistory: {
                        ...prev.medicalHistory,
                        lifestyleHabits: {
                          ...prev.medicalHistory.lifestyleHabits,
                          frequentAlcoholConsumption: next,
                        },
                      },
                    }))
                  }
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Qualidade de sono *
                    </label>
                    <select
                      value={form.medicalHistory.lifestyleHabits.sleepQuality}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          medicalHistory: {
                            ...prev.medicalHistory,
                            lifestyleHabits: {
                              ...prev.medicalHistory.lifestyleHabits,
                              sleepQuality: e.target.value as SleepQuality,
                            },
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                    >
                      {(Object.keys(SLEEP_QUALITY_LABELS) as SleepQuality[]).map((key) => (
                        <option key={key} value={key}>
                          {SLEEP_QUALITY_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Horas de sono / noite *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      max={24}
                      value={form.medicalHistory.lifestyleHabits.sleepHoursPerNight}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          medicalHistory: {
                            ...prev.medicalHistory,
                            lifestyleHabits: {
                              ...prev.medicalHistory.lifestyleHabits,
                              sleepHoursPerNight: Number(e.target.value),
                            },
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Nível de estresse *
                    </label>
                    <select
                      value={form.medicalHistory.lifestyleHabits.stressLevel}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          medicalHistory: {
                            ...prev.medicalHistory,
                            lifestyleHabits: {
                              ...prev.medicalHistory.lifestyleHabits,
                              stressLevel: e.target.value as StressLevel,
                            },
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                    >
                      {(Object.keys(STRESS_LEVEL_LABELS) as StressLevel[]).map((key) => (
                        <option key={key} value={key}>
                          {STRESS_LEVEL_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* 3.4 Histórico de lesões */}
              <section className="space-y-2.5 border-t border-slate-200 pt-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Histórico de lesões
                </h3>
                {(
                  [
                    ['fracture', 'Você já sofreu alguma fratura?'],
                    ['dislocation', 'Você já teve alguma luxação?'],
                    ['muscleInjury', 'Você já sofreu alguma lesão muscular?'],
                    ['ligamentInjury', 'Você já teve alguma lesão ligamentar?'],
                    ['movementLimitation', 'Você possui alguma limitação de movimento?'],
                    ['painDuringSpecificMovements', 'Sente dores durante movimentos específicos?'],
                    [
                      'surgeryOrMedicalProcedure',
                      'Já realizou alguma cirurgia ou procedimento médico?',
                    ],
                    [
                      'stoppedExerciseForHealthReason',
                      'Já precisou interromper atividades físicas por problemas de saúde?',
                    ],
                    [
                      'medicalRestrictionForExercise',
                      'Possui alguma restrição médica para exercícios físicos?',
                    ],
                  ] as const
                ).map(([field, label]) => (
                  <YesNoDetailField
                    key={field}
                    label={label}
                    value={form.medicalHistory.injuryHistory[field]}
                    onChange={(next) =>
                      setForm((prev) => ({
                        ...prev,
                        medicalHistory: {
                          ...prev.medicalHistory,
                          injuryHistory: {
                            ...prev.medicalHistory.injuryHistory,
                            [field]: next,
                          },
                        },
                      }))
                    }
                  />
                ))}
              </section>

              {/* 3.5 Medicamentos e acompanhamento */}
              <section className="space-y-2.5 border-t border-slate-200 pt-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Medicamentos e acompanhamento
                </h3>
                <YesNoBooleanField
                  label="Você utiliza algum medicamento atualmente?"
                  highlightYes
                  value={form.medicalHistory.medicationsAndCare.usesMedication}
                  onChange={(next) =>
                    setForm((prev) => ({
                      ...prev,
                      medicalHistory: {
                        ...prev.medicalHistory,
                        medicationsAndCare: {
                          ...prev.medicalHistory.medicationsAndCare,
                          usesMedication: next,
                          medicationsList: next
                            ? prev.medicalHistory.medicationsAndCare.medicationsList
                            : null,
                        },
                      },
                    }))
                  }
                />

                {form.medicalHistory.medicationsAndCare.usesMedication && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Quais medicamentos utiliza?
                    </label>
                    <input
                      type="text"
                      value={form.medicalHistory.medicationsAndCare.medicationsList ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          medicalHistory: {
                            ...prev.medicalHistory,
                            medicationsAndCare: {
                              ...prev.medicalHistory.medicationsAndCare,
                              medicationsList: e.target.value || null,
                            },
                          },
                        }))
                      }
                      placeholder="Ex.: Losartana, Levotiroxina..."
                      className="w-full rounded-xl border border-amber-300 bg-amber-50/40 px-3.5 py-2.5 text-sm focus:border-amber-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                )}

                <YesNoBooleanField
                  label="Faz acompanhamento médico regularmente?"
                  value={form.medicalHistory.medicationsAndCare.regularMedicalFollowUp}
                  onChange={(next) =>
                    setForm((prev) => ({
                      ...prev,
                      medicalHistory: {
                        ...prev.medicalHistory,
                        medicationsAndCare: {
                          ...prev.medicalHistory.medicationsAndCare,
                          regularMedicalFollowUp: next,
                        },
                      },
                    }))
                  }
                />
                <YesNoBooleanField
                  label="Faz acompanhamento com fisioterapeuta?"
                  value={form.medicalHistory.medicationsAndCare.physiotherapyFollowUp}
                  onChange={(next) =>
                    setForm((prev) => ({
                      ...prev,
                      medicalHistory: {
                        ...prev.medicalHistory,
                        medicationsAndCare: {
                          ...prev.medicalHistory.medicationsAndCare,
                          physiotherapyFollowUp: next,
                        },
                      },
                    }))
                  }
                />
                <YesNoDetailField
                  label="Possui alguma recomendação ou restrição médica?"
                  value={form.medicalHistory.medicationsAndCare.medicalRecommendationOrRestriction}
                  onChange={(next) =>
                    setForm((prev) => ({
                      ...prev,
                      medicalHistory: {
                        ...prev.medicalHistory,
                        medicationsAndCare: {
                          ...prev.medicalHistory.medicationsAndCare,
                          medicalRecommendationOrRestriction: next,
                        },
                      },
                    }))
                  }
                />
                <YesNoBooleanField
                  label="Possui exames recentes relacionados à saúde?"
                  value={form.medicalHistory.medicationsAndCare.hasRecentHealthExams}
                  onChange={(next) =>
                    setForm((prev) => ({
                      ...prev,
                      medicalHistory: {
                        ...prev.medicalHistory,
                        medicationsAndCare: {
                          ...prev.medicalHistory.medicationsAndCare,
                          hasRecentHealthExams: next,
                        },
                      },
                    }))
                  }
                />
              </section>
            </div>
          )}

          {/* STEP 4 — HISTÓRICO DE ATIVIDADE FÍSICA */}
          {step === 4 && (
            <div className="mt-5 space-y-4">
              <YesNoBooleanField
                label="Você já praticou musculação?"
                value={form.physicalActivityHistory.practicedWeightTraining}
                onChange={(next) =>
                  setForm((prev) => ({
                    ...prev,
                    physicalActivityHistory: {
                      ...prev.physicalActivityHistory,
                      practicedWeightTraining: next,
                      weightTrainingDuration: next
                        ? prev.physicalActivityHistory.weightTrainingDuration
                        : null,
                    },
                  }))
                }
              />

              {form.physicalActivityHistory.practicedWeightTraining && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Há quanto tempo pratica ou praticou musculação?
                  </label>
                  <input
                    type="text"
                    value={form.physicalActivityHistory.weightTrainingDuration ?? ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        physicalActivityHistory: {
                          ...prev.physicalActivityHistory,
                          weightTrainingDuration: e.target.value || null,
                        },
                      }))
                    }
                    placeholder="Ex.: 1 ano e meio, 6 meses..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>
              )}

              <YesNoBooleanField
                label="Atualmente pratica alguma atividade física?"
                value={form.physicalActivityHistory.currentlyActive}
                onChange={(next) =>
                  setForm((prev) => ({
                    ...prev,
                    physicalActivityHistory: {
                      ...prev.physicalActivityHistory,
                      currentlyActive: next,
                      currentActivity: next ? prev.physicalActivityHistory.currentActivity : null,
                      currentWeeklyFrequency: next
                        ? prev.physicalActivityHistory.currentWeeklyFrequency ?? 3
                        : null,
                      timeInactive: next ? null : prev.physicalActivityHistory.timeInactive,
                    },
                  }))
                }
              />

              {form.physicalActivityHistory.currentlyActive ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Qual atividade pratica?
                    </label>
                    <input
                      type="text"
                      value={form.physicalActivityHistory.currentActivity ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          physicalActivityHistory: {
                            ...prev.physicalActivityHistory,
                            currentActivity: e.target.value || null,
                          },
                        }))
                      }
                      placeholder="Ex.: Caminhada, corrida, pilates..."
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Quantas vezes por semana?
                    </label>
                    <select
                      value={form.physicalActivityHistory.currentWeeklyFrequency ?? 3}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          physicalActivityHistory: {
                            ...prev.physicalActivityHistory,
                            currentWeeklyFrequency: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <option key={n} value={n}>
                          {n}x por semana
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Quanto tempo está sem treinar?
                  </label>
                  <input
                    type="text"
                    value={form.physicalActivityHistory.timeInactive ?? ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        physicalActivityHistory: {
                          ...prev.physicalActivityHistory,
                          timeInactive: e.target.value || null,
                        },
                      }))
                    }
                    placeholder="Ex.: 6 meses, 2 anos, nunca treinei..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>
              )}

              <YesNoDetailField
                label="Já teve alguma experiência negativa durante exercícios físicos?"
                value={form.physicalActivityHistory.negativeExperienceDuringExercise}
                onChange={(next) =>
                  setForm((prev) => ({
                    ...prev,
                    physicalActivityHistory: {
                      ...prev.physicalActivityHistory,
                      negativeExperienceDuringExercise: next,
                    },
                  }))
                }
                detailPlaceholder="Conte rapidamente o que aconteceu (opcional)"
              />
            </div>
          )}

          {/* STEP 5 — OBJETIVOS E EXPECTATIVAS */}
          {step === 5 && (
            <div className="mt-5 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Qual é seu principal objetivo? *
                </label>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {(Object.keys(PRIMARY_GOAL_LABELS) as PrimaryGoal[]).map((goalKey) => {
                    const selected = form.goalsAndExpectations.primaryGoal === goalKey
                    return (
                      <button
                        key={goalKey}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            goalsAndExpectations: {
                              ...prev.goalsAndExpectations,
                              primaryGoal: goalKey,
                              primaryGoalOther:
                                goalKey === 'OTHER'
                                  ? prev.goalsAndExpectations.primaryGoalOther
                                  : null,
                            },
                          }))
                        }
                        className={`rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition ${
                          selected
                            ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                        }`}
                      >
                        {PRIMARY_GOAL_LABELS[goalKey]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {form.goalsAndExpectations.primaryGoal === 'OTHER' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Descreva seu objetivo principal *
                  </label>
                  <input
                    type="text"
                    value={form.goalsAndExpectations.primaryGoalOther ?? ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        goalsAndExpectations: {
                          ...prev.goalsAndExpectations,
                          primaryGoalOther: e.target.value || null,
                        },
                      }))
                    }
                    placeholder="Ex.: Preparação para prova de corrida"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Qual é seu objetivo secundário? (opcional)
                  </label>
                  <input
                    type="text"
                    value={form.goalsAndExpectations.secondaryGoal ?? ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        goalsAndExpectations: {
                          ...prev.goalsAndExpectations,
                          secondaryGoal: e.target.value || null,
                        },
                      }))
                    }
                    placeholder="Ex.: Melhorar postura e disposição"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Alguma região do corpo com maior atenção? (opcional)
                  </label>
                  <input
                    type="text"
                    value={form.goalsAndExpectations.focusBodyArea ?? ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        goalsAndExpectations: {
                          ...prev.goalsAndExpectations,
                          focusBodyArea: e.target.value || null,
                        },
                      }))
                    }
                    placeholder="Ex.: Glúteos, pernas, costas, abdômen..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Qual é sua disponibilidade semanal para treinar? *
                </label>
                <input
                  type="text"
                  value={form.goalsAndExpectations.weeklyAvailability}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      goalsAndExpectations: {
                        ...prev.goalsAndExpectations,
                        weeklyAvailability: e.target.value,
                      },
                    }))
                  }
                  placeholder="Ex.: Segunda, quarta e sexta às 18h ou manhã cedo"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Quantas vezes por semana pretende treinar? *
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((freq) => {
                    const selected = form.goalsAndExpectations.intendedWeeklyFrequency === freq
                    return (
                      <button
                        key={freq}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            goalsAndExpectations: {
                              ...prev.goalsAndExpectations,
                              intendedWeeklyFrequency: freq,
                            },
                          }))
                        }
                        className={`min-h-[44px] rounded-xl border text-sm font-bold transition ${
                          selected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {freq}x
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 6 — INFORMAÇÕES FÍSICAS */}
          {step === 6 && (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-slate-500">
                Preencha o que você souber — caso não saiba alguma medida, o personal completa com
                você na avaliação presencial.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Peso atual (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={form.physicalAssessment.weightKg ?? ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        physicalAssessment: {
                          ...prev.physicalAssessment,
                          weightKg: parseOptionalNumber(e.target.value),
                        },
                      }))
                    }
                    placeholder="Ex.: 72.5"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Altura (cm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    inputMode="decimal"
                    value={form.physicalAssessment.heightCm ?? ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        physicalAssessment: {
                          ...prev.physicalAssessment,
                          heightCm: parseOptionalNumber(e.target.value),
                        },
                      }))
                    }
                    placeholder="Ex.: 175"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <button
                  type="button"
                  onClick={() => setShowOptionalMetrics((prev) => !prev)}
                  className="flex w-full items-center justify-between text-sm font-semibold text-slate-700"
                >
                  <span>Medidas complementares (opcionais)</span>
                  {showOptionalMetrics ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showOptionalMetrics && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Percentual de gordura corporal (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        inputMode="decimal"
                        value={form.physicalAssessment.bodyFatPercentage ?? ''}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            physicalAssessment: {
                              ...prev.physicalAssessment,
                              bodyFatPercentage: parseOptionalNumber(e.target.value),
                            },
                          }))
                        }
                        placeholder="Ex.: 18.5"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Massa muscular (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        inputMode="decimal"
                        value={form.physicalAssessment.muscleMassKg ?? ''}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            physicalAssessment: {
                              ...prev.physicalAssessment,
                              muscleMassKg: parseOptionalNumber(e.target.value),
                            },
                          }))
                        }
                        placeholder="Ex.: 35.0"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Pressão arterial
                      </label>
                      <input
                        type="text"
                        value={form.physicalAssessment.bloodPressure ?? ''}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            physicalAssessment: {
                              ...prev.physicalAssessment,
                              bloodPressure: e.target.value || null,
                            },
                          }))
                        }
                        placeholder="Ex.: 120/80"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Frequência cardíaca em repouso (bpm)
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={form.physicalAssessment.restingHeartRate ?? ''}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            physicalAssessment: {
                              ...prev.physicalAssessment,
                              restingHeartRate: parseOptionalNumber(e.target.value),
                            },
                          }))
                        }
                        placeholder="Ex.: 68"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 7 — TERMO DE RESPONSABILIDADE, LGPD E ASSINATURA */}
          {step === 7 && (
            <div className="mt-5 space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  {terms.title}
                </h3>
                <div className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-700 sm:text-sm">
                  {terms.paragraphs.map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.consent.termsAccepted}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        consent: { ...prev.consent, termsAccepted: e.target.checked },
                      }))
                    }
                    className="mt-0.5 h-5 w-5 rounded border-slate-300 accent-slate-900"
                  />
                  <span className="text-sm text-slate-800">{terms.termsAcceptanceLabel}</span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.consent.lgpdConsentAccepted}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        consent: { ...prev.consent, lgpdConsentAccepted: e.target.checked },
                      }))
                    }
                    className="mt-0.5 h-5 w-5 rounded border-slate-300 accent-slate-900"
                  />
                  <span className="text-sm text-slate-800">{terms.lgpdConsentLabel}</span>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Nome completo do aluno (ou responsável legal) *
                  </label>
                  <input
                    type="text"
                    value={form.consent.signerName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        consent: { ...prev.consent, signerName: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Data do preenchimento
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={new Date().toLocaleDateString('pt-BR')}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-600"
                  />
                </div>
              </div>

              <SignaturePad
                value={form.consent.signatureImage}
                onChange={(dataUrl) =>
                  setForm((prev) => ({
                    ...prev,
                    consent: { ...prev.consent, signatureImage: dataUrl },
                  }))
                }
              />
            </div>
          )}

          {/* NAVIGATION FOOTER */}
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
            ) : (
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Início
              </Link>
            )}

            {step < STEPS.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Próximo
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Finalizar Cadastro
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Seu progresso é salvo automaticamente neste aparelho.
        </p>
      </main>
    </div>
  )
}
