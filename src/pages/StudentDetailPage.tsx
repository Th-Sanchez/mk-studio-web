import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Contact,
  Dumbbell,
  FileSignature,
  Loader2,
  MessageCircle,
  Pencil,
  Phone,
  Save,
  Scale,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  Trash2,
  X,
} from 'lucide-react'
import { ThemeToggle } from '../components/ThemeToggle'
import { ApiError } from '../services/api'
import { logoutAdmin } from '../services/authService'
import {
  deleteStudent,
  fetchStudentDetail,
  updateStudent,
  updateStudentAssessment,
  updateStudentStatus,
} from '../services/studentService'
import {
  GENDER_LABELS,
  PRIMARY_GOAL_LABELS,
  SLEEP_QUALITY_LABELS,
  STATUS_LABELS,
  STRESS_LEVEL_LABELS,
  type Gender,
  type StudentDetail,
  type StudentStatus,
  type UpdateAssessmentPayload,
  type UpdateStudentPayload,
  type YesNoDetail,
} from '../types/anamnesis'
import {
  buildWhatsAppUrl,
  formatDateBR,
  formatDateTimeBR,
  formatPhone,
  formatZipCode,
  parseOptionalNumber,
} from '../utils/formatters'

type DetailTab = 'assessment' | 'medical' | 'activity' | 'personal' | 'consent'

const INPUT_CLASS =
  'w-full rounded-[4px] border border-mk-hairline bg-white px-3 py-2 text-sm text-black focus:border-black focus:outline-none dark:border-white/15 dark:bg-mk-elevated dark:text-mk-ivory dark:focus:border-mk-gold'

const LABEL_CLASS =
  'mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-mk-stone dark:text-mk-stone-dark'

function classifyBmi(bmi: number): string {
  if (bmi < 18.5) return 'Abaixo do peso'
  if (bmi < 25) return 'Peso normal'
  if (bmi < 30) return 'Sobrepeso'
  return 'Obesidade'
}

function AnswerRow({ label, item }: { label: string; item: YesNoDetail }) {
  return (
    <div
      className={`rounded-[4px] border p-3 text-sm ${
        item.answer
          ? 'border-amber-300 bg-[#FFFDF5] text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/35 dark:text-amber-100'
          : 'border-mk-hairline bg-white text-black dark:border-white/10 dark:bg-mk-elevated dark:text-mk-ivory'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span
          className={`shrink-0 rounded-[3px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            item.answer
              ? 'bg-mk-gold text-black'
              : 'bg-mk-alabaster text-mk-stone dark:bg-white/10 dark:text-mk-stone-dark'
          }`}
        >
          {item.answer ? 'Sim' : 'Não'}
        </span>
      </div>
      {item.answer && item.details && (
        <p className="mt-1.5 text-xs font-medium text-amber-900 dark:text-amber-200">
          Detalhe: {item.details}
        </p>
      )}
    </div>
  )
}

function BoolRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-[4px] border border-mk-hairline bg-white p-3 text-sm text-black dark:border-white/10 dark:bg-mk-elevated dark:text-mk-ivory">
      <span>{label}</span>
      <span
        className={`shrink-0 rounded-[3px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          value
            ? 'bg-black text-white dark:bg-mk-gold dark:text-black'
            : 'bg-mk-alabaster text-mk-stone dark:bg-white/10 dark:text-mk-stone-dark'
        }`}
      >
        {value ? 'Sim' : 'Não'}
      </span>
    </div>
  )
}

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [activeTab, setActiveTab] = useState<DetailTab>('assessment')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const [assessmentForm, setAssessmentForm] = useState<UpdateAssessmentPayload>({
    weightKg: null,
    heightCm: null,
    bodyFatPercentage: null,
    muscleMassKg: null,
    bloodPressure: null,
    restingHeartRate: null,
    professionalNotes: null,
  })
  const [savingAssessment, setSavingAssessment] = useState(false)

  const [editingStudent, setEditingStudent] = useState(false)
  const [studentForm, setStudentForm] = useState<UpdateStudentPayload | null>(null)
  const [savingStudent, setSavingStudent] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const syncForms = useCallback((detail: StudentDetail) => {
    if (detail.latestAnamnesis) {
      const a = detail.latestAnamnesis.physicalAssessment
      setAssessmentForm({
        weightKg: a.weightKg,
        heightCm: a.heightCm,
        bodyFatPercentage: a.bodyFatPercentage,
        muscleMassKg: a.muscleMassKg,
        bloodPressure: a.bloodPressure,
        restingHeartRate: a.restingHeartRate,
        professionalNotes: a.professionalNotes,
      })
    }
    setStudentForm({
      fullName: detail.fullName,
      birthDate: detail.birthDate,
      gender: detail.gender,
      phone: formatPhone(detail.phone),
      email: detail.email,
      address: {
        ...detail.address,
        zipCode: formatZipCode(detail.address.zipCode),
      },
      emergencyContact: {
        ...detail.emergencyContact,
        phone: formatPhone(detail.emergencyContact.phone),
      },
      status: detail.status,
    })
  }, [])

  const loadDetail = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const detail = await fetchStudentDetail(id)
      setStudent(detail)
      syncForms(detail)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logoutAdmin()
        navigate('/login', { replace: true })
        return
      }
      setError(err instanceof Error ? err.message : 'Erro ao carregar ficha do aluno.')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, syncForms])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  function showToast(msg: string) {
    setFeedback(msg)
    window.setTimeout(() => setFeedback(null), 3000)
  }

  async function handleStatusChange(nextStatus: StudentStatus) {
    if (!student || student.status === nextStatus) return
    setUpdatingStatus(true)
    try {
      const updated = await updateStudentStatus(student.id, nextStatus)
      setStudent(updated)
      syncForms(updated)
      showToast(`Status alterado para ${STATUS_LABELS[nextStatus]}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function handleSaveAssessment(e: FormEvent) {
    e.preventDefault()
    if (!student?.latestAnamnesis) return
    setSavingAssessment(true)
    setError(null)
    try {
      const updated = await updateStudentAssessment(
        student.id,
        student.latestAnamnesis.id,
        assessmentForm,
      )
      setStudent(updated)
      syncForms(updated)
      showToast('Avaliação salva com sucesso')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar avaliação.')
    } finally {
      setSavingAssessment(false)
    }
  }

  async function handleSaveStudent(e: FormEvent) {
    e.preventDefault()
    if (!student || !studentForm) return
    setSavingStudent(true)
    setError(null)
    try {
      const updated = await updateStudent(student.id, studentForm)
      setStudent(updated)
      syncForms(updated)
      setEditingStudent(false)
      showToast('Dados cadastrais atualizados')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar dados do aluno.')
    } finally {
      setSavingStudent(false)
    }
  }

  async function handleDelete() {
    if (!student) return
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir permanentemente o cadastro de "${student.fullName}" e sua anamnese?`,
    )
    if (!confirmed) return
    setDeleting(true)
    try {
      await deleteStudent(student.id)
      navigate('/alunos', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir aluno.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-mk-alabaster text-mk-stone dark:bg-black dark:text-mk-stone-dark">
        <Loader2 className="h-6 w-6 animate-spin text-mk-gold" />
        <p className="mt-2 text-sm">Carregando dossiê...</p>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-mk-alabaster px-4 py-12 text-center dark:bg-black">
        <p className="text-sm text-rose-700 dark:text-rose-300">
          {error || 'Aluno não encontrado.'}
        </p>
        <Link
          to="/alunos"
          className="mt-4 inline-flex items-center gap-1.5 rounded-[4px] bg-mk-gold px-4 py-2 text-xs font-bold uppercase tracking-wider text-black"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para lista
        </Link>
      </div>
    )
  }

  const anamnesis = student.latestAnamnesis
  const shortRegCode = `REG #MK-${student.id.slice(0, 6).toUpperCase()}`
  const bmiValue =
    assessmentForm.weightKg && assessmentForm.heightCm && assessmentForm.heightCm > 0
      ? assessmentForm.weightKg / Math.pow(assessmentForm.heightCm / 100, 2)
      : null

  const notesLength = assessmentForm.professionalNotes?.length ?? 0

  return (
    <div className="min-h-screen bg-mk-alabaster pb-16 transition-colors dark:bg-black">
      {/* Sticky Editorial Top Header */}
      <header className="sticky top-0 z-30 border-b border-mk-hairline/70 bg-white/95 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl dark:border-white/12 dark:bg-black/95">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-2 px-4">
          <Link
            to="/alunos"
            className="inline-flex h-10 items-center gap-1.5 rounded-[4px] px-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-black transition hover:text-mk-gold-text dark:text-mk-ivory dark:hover:text-mk-gold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Alunos</span>
          </Link>

          <div className="flex flex-col items-center text-center">
            <span className="text-[9px] font-semibold uppercase leading-none tracking-[0.25em] text-mk-gold-text dark:text-mk-gold">
              MK STUDIO
            </span>
            <h1 className="mt-0.5 whitespace-nowrap font-serif text-xs font-semibold uppercase leading-tight tracking-[0.15em] text-black dark:text-mk-ivory">
              Dossiê do Aluno
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={buildWhatsAppUrl(
                student.phone,
                `Olá ${student.fullName.split(' ')[0]}, tudo bem? Aqui é do MK STUDIO!`,
              )}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-[4px] bg-[#16A34A] px-3 text-[11px] font-semibold tracking-wider text-white shadow-[0_1px_4px_rgba(22,163,74,0.2)] transition hover:bg-emerald-700"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Floating Bottom Editorial Save Toast */}
      {feedback && (
        <div className="fixed inset-x-4 bottom-6 z-50 mx-auto flex max-w-sm items-center justify-between rounded-[4px] bg-black px-4 py-3 text-white shadow-2xl dark:border dark:border-mk-gold/40 dark:bg-mk-charcoal">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-mk-gold" />
            <span className="text-xs font-semibold tracking-wide">{feedback}</span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-mk-gold">
            MK • SYNC
          </span>
        </div>
      )}

      <main className="mx-auto max-w-2xl space-y-4 px-4 pt-5">
        {error && (
          <div className="rounded-[4px] border border-rose-300 bg-rose-50 p-3.5 text-sm text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-200">
            {error}
          </div>
        )}

        {/* 1. Student Summary Card (Stitch Vogue Light fidelity) */}
        <section className="relative overflow-hidden rounded-[4px] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:border dark:border-white/12 dark:bg-mk-charcoal">
          {/* Top 2px Gold Gradient Accent */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-mk-gold via-mk-gold-text to-transparent" />

          <div className="mb-2 flex items-start justify-between gap-3">
            <div
              className={`inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-0.5 ${
                student.status === 'NEW'
                  ? 'bg-[#FFF8E7] text-mk-gold-text dark:bg-mk-gold/15 dark:text-mk-gold'
                  : student.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-mk-alabaster text-mk-stone dark:bg-white/10 dark:text-mk-stone-dark'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  student.status === 'NEW'
                    ? 'animate-pulse bg-mk-gold'
                    : student.status === 'ACTIVE'
                      ? 'bg-emerald-500'
                      : 'bg-mk-stone'
                }`}
              />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                {STATUS_LABELS[student.status]}
              </span>
            </div>

            <span className="font-mono text-[10px] uppercase tracking-wider text-mk-stone/80 dark:text-mk-stone-dark/80">
              {shortRegCode}
            </span>
          </div>

          <h2 className="mb-1 font-serif text-[26px] font-semibold leading-tight tracking-tight text-black dark:text-mk-ivory">
            {student.fullName}
          </h2>

          <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-mk-stone dark:text-mk-stone-dark">
            <span>
              {student.age} anos ({formatDateBR(student.birthDate)})
            </span>
            <span className="text-mk-hairline dark:text-white/20">•</span>
            <span>{GENDER_LABELS[student.gender]}</span>
            <span className="text-mk-hairline dark:text-white/20">•</span>
            <span className="font-medium text-black dark:text-mk-ivory">
              {formatPhone(student.phone)}
            </span>
          </p>

          {anamnesis && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-[3px] bg-mk-alabaster px-2.5 py-1 text-black dark:bg-white/8 dark:text-mk-ivory">
                <Dumbbell className="h-3.5 w-3.5 text-mk-gold-text dark:text-mk-gold" />
                <span className="text-[11px] font-medium tracking-wide">
                  {anamnesis.primaryGoal === 'OTHER' && anamnesis.primaryGoalOther
                    ? anamnesis.primaryGoalOther
                    : PRIMARY_GOAL_LABELS[anamnesis.primaryGoal]}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-[3px] bg-mk-alabaster px-2.5 py-1 text-black dark:bg-white/8 dark:text-mk-ivory">
                <Calendar className="h-3.5 w-3.5 text-mk-gold-text dark:text-mk-gold" />
                <span className="text-[11px] font-medium tracking-wide">
                  {anamnesis.intendedWeeklyFrequency}x / semana
                </span>
              </div>
              <span className="ml-auto self-center text-[10px] uppercase tracking-widest text-mk-stone/75 dark:text-mk-stone-dark/75">
                CAD. {formatDateBR(student.createdAt)}
              </span>
            </div>
          )}

          {/* Inset Segmented Status Switcher */}
          <div className="-mx-5 -mb-5 bg-mk-alabaster/70 px-5 py-3 dark:bg-white/5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-mk-stone dark:text-mk-stone-dark">
                Status Cadastral
              </span>
              <span className="text-[9px] font-medium uppercase tracking-wider text-mk-gold-text dark:text-mk-gold">
                Atualizado {formatDateBR(student.updatedAt)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-[4px] bg-white p-1 shadow-xs dark:bg-mk-elevated">
              {(['NEW', 'ACTIVE', 'INACTIVE'] as StudentStatus[]).map((s) => {
                const isSelected = student.status === s
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange(s)}
                    className={`flex items-center justify-center gap-1.5 rounded-[3px] py-1.5 text-[11px] uppercase tracking-wider transition-all ${
                      isSelected
                        ? 'bg-black font-bold text-white shadow-xs dark:bg-mk-gold dark:text-black'
                        : 'font-medium text-mk-stone hover:text-black dark:text-mk-stone-dark dark:hover:text-mk-ivory'
                    }`}
                  >
                    {isSelected && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          s === 'INACTIVE' ? 'bg-mk-stone' : 'bg-mk-gold dark:bg-black'
                        }`}
                      />
                    )}
                    {STATUS_LABELS[s]}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* 2. Health Alerts Callout Box (Left 4px Gold Bar) */}
        {anamnesis && anamnesis.healthAlerts.length > 0 && (
          <section className="relative overflow-hidden rounded-[4px] bg-[#FFFDF5] p-4 shadow-[0_1px_8px_rgba(221,164,34,0.08)] dark:border dark:border-amber-700/40 dark:bg-amber-950/30">
            <div className="absolute inset-y-0 left-0 w-[4px] bg-mk-gold" />
            <div className="pl-2">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-mk-gold-text dark:text-mk-gold" />
                  <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#92400E] dark:text-amber-300">
                    Alertas de Saúde e Lesões ({anamnesis.healthAlerts.length})
                  </h3>
                </div>
                <span className="shrink-0 rounded-[3px] bg-[#FEF3C7] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#92400E] dark:bg-amber-900/60 dark:text-amber-200">
                  Atenção Clínica
                </span>
              </div>

              <ul className="space-y-1.5">
                {anamnesis.healthAlerts.map((alert, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D97706] dark:bg-mk-gold" />
                    <span className="text-xs font-semibold text-black dark:text-mk-ivory">
                      {alert}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* 3. Editorial Horizontal Scrollable Tabs */}
        <nav aria-label="Abas do dossiê" className="-mx-4 overflow-x-auto px-4 py-1">
          <div className="flex min-w-max items-center gap-2">
            {(
              [
                { id: 'assessment', label: 'Avaliação & Notas', Icon: Activity },
                { id: 'medical', label: 'Histórico Médico', Icon: Stethoscope },
                { id: 'activity', label: 'Atividade & Objetivos', Icon: Target },
                { id: 'personal', label: 'Cadastro & Emergência', Icon: Contact },
                { id: 'consent', label: 'Termo & Assinatura', Icon: FileSignature },
              ] as const
            ).map(({ id: tabId, label, Icon }) => {
              const active = activeTab === tabId
              return (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => setActiveTab(tabId)}
                  className={`flex items-center gap-1.5 rounded-[3px] px-3.5 py-2 text-[11px] uppercase tracking-wider transition-all ${
                    active
                      ? 'bg-black font-semibold text-white shadow-xs dark:bg-mk-gold dark:text-black'
                      : 'bg-white font-medium text-mk-stone shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:text-black dark:border dark:border-white/10 dark:bg-mk-charcoal dark:text-mk-stone-dark dark:hover:text-mk-ivory'
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 ${
                      active ? 'text-mk-gold dark:text-black' : 'text-mk-stone dark:text-mk-stone-dark'
                    }`}
                  />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* TAB 1: 6. INFORMAÇÕES FÍSICAS E AVALIAÇÃO */}
        {activeTab === 'assessment' && anamnesis && (
          <section className="space-y-5 rounded-[4px] bg-white p-5 shadow-[0_2px_14px_rgba(0,0,0,0.04)] dark:border dark:border-white/12 dark:bg-mk-charcoal">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-mk-gold-text dark:text-mk-gold">
                  Módulo de Performance
                </span>
                <span className="font-mono text-[10px] text-mk-stone dark:text-mk-stone-dark">
                  {formatDateBR(anamnesis.updatedAt)}
                </span>
              </div>
              <h3 className="font-serif text-lg font-semibold tracking-tight text-black dark:text-mk-ivory">
                6. Informações Físicas e Avaliação
              </h3>
              <p className="text-xs leading-relaxed text-mk-stone dark:text-mk-stone-dark">
                Métricas antropométricas e notas clínicas do treinador responsável.
              </p>
            </div>

            {/* Highlight IMC Card */}
            {bmiValue !== null && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] bg-mk-alabaster p-3.5 dark:bg-mk-elevated">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-white text-mk-gold-text shadow-2xs dark:bg-mk-charcoal dark:text-mk-gold">
                    <Scale className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-mk-stone dark:text-mk-stone-dark">
                      Diagnóstico Corporal
                    </span>
                    <span className="text-sm font-bold text-black dark:text-mk-ivory">
                      IMC estimado:{' '}
                      <span className="font-serif text-base text-mk-gold-text dark:text-mk-gold">
                        {bmiValue.toFixed(1)}
                      </span>
                    </span>
                  </div>
                </div>
                <span className="inline-block rounded-[3px] bg-white px-2.5 py-1 text-[10px] font-semibold tracking-wide text-black shadow-2xs dark:bg-mk-charcoal dark:text-mk-ivory">
                  {classifyBmi(bmiValue)}
                </span>
              </div>
            )}

            {/* Anthropometric 2-Column Editorial Metric Tiles */}
            <form onSubmit={handleSaveAssessment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[4px] bg-mk-alabaster/70 p-2.5 transition-all focus-within:bg-white focus-within:ring-1 focus-within:ring-mk-gold dark:bg-mk-elevated dark:focus-within:bg-mk-charcoal">
                  <div className="mb-1 flex items-center justify-between">
                    <label
                      htmlFor="weightKg"
                      className="text-[9px] font-bold uppercase tracking-[0.16em] text-mk-stone dark:text-mk-stone-dark"
                    >
                      Peso Atual
                    </label>
                    <span className="text-[10px] font-semibold text-mk-gold-text dark:text-mk-gold">
                      KG
                    </span>
                  </div>
                  <input
                    id="weightKg"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={assessmentForm.weightKg ?? ''}
                    onChange={(e) =>
                      setAssessmentForm((prev) => ({
                        ...prev,
                        weightKg: parseOptionalNumber(e.target.value),
                      }))
                    }
                    placeholder="—"
                    className="w-full bg-transparent font-serif text-lg font-semibold tracking-wide text-black focus:outline-none dark:text-mk-ivory"
                  />
                </div>

                <div className="rounded-[4px] bg-mk-alabaster/70 p-2.5 transition-all focus-within:bg-white focus-within:ring-1 focus-within:ring-mk-gold dark:bg-mk-elevated dark:focus-within:bg-mk-charcoal">
                  <div className="mb-1 flex items-center justify-between">
                    <label
                      htmlFor="heightCm"
                      className="text-[9px] font-bold uppercase tracking-[0.16em] text-mk-stone dark:text-mk-stone-dark"
                    >
                      Altura
                    </label>
                    <span className="text-[10px] font-semibold text-mk-gold-text dark:text-mk-gold">
                      CM
                    </span>
                  </div>
                  <input
                    id="heightCm"
                    type="number"
                    step="0.5"
                    inputMode="decimal"
                    value={assessmentForm.heightCm ?? ''}
                    onChange={(e) =>
                      setAssessmentForm((prev) => ({
                        ...prev,
                        heightCm: parseOptionalNumber(e.target.value),
                      }))
                    }
                    placeholder="—"
                    className="w-full bg-transparent font-serif text-lg font-semibold tracking-wide text-black focus:outline-none dark:text-mk-ivory"
                  />
                </div>

                <div className="rounded-[4px] bg-mk-alabaster/70 p-2.5 transition-all focus-within:bg-white focus-within:ring-1 focus-within:ring-mk-gold dark:bg-mk-elevated dark:focus-within:bg-mk-charcoal">
                  <div className="mb-1 flex items-center justify-between">
                    <label
                      htmlFor="bodyFatPercentage"
                      className="text-[9px] font-bold uppercase tracking-[0.16em] text-mk-stone dark:text-mk-stone-dark"
                    >
                      % Gordura
                    </label>
                    <span className="text-[10px] font-semibold text-mk-gold-text dark:text-mk-gold">
                      %
                    </span>
                  </div>
                  <input
                    id="bodyFatPercentage"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={assessmentForm.bodyFatPercentage ?? ''}
                    onChange={(e) =>
                      setAssessmentForm((prev) => ({
                        ...prev,
                        bodyFatPercentage: parseOptionalNumber(e.target.value),
                      }))
                    }
                    placeholder="—"
                    className="w-full bg-transparent font-serif text-lg font-semibold tracking-wide text-black focus:outline-none dark:text-mk-ivory"
                  />
                </div>

                <div className="rounded-[4px] bg-mk-alabaster/70 p-2.5 transition-all focus-within:bg-white focus-within:ring-1 focus-within:ring-mk-gold dark:bg-mk-elevated dark:focus-within:bg-mk-charcoal">
                  <div className="mb-1 flex items-center justify-between">
                    <label
                      htmlFor="muscleMassKg"
                      className="text-[9px] font-bold uppercase tracking-[0.16em] text-mk-stone dark:text-mk-stone-dark"
                    >
                      Massa Musc.
                    </label>
                    <span className="text-[10px] font-semibold text-mk-gold-text dark:text-mk-gold">
                      KG
                    </span>
                  </div>
                  <input
                    id="muscleMassKg"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={assessmentForm.muscleMassKg ?? ''}
                    onChange={(e) =>
                      setAssessmentForm((prev) => ({
                        ...prev,
                        muscleMassKg: parseOptionalNumber(e.target.value),
                      }))
                    }
                    placeholder="—"
                    className="w-full bg-transparent font-serif text-lg font-semibold tracking-wide text-black focus:outline-none dark:text-mk-ivory"
                  />
                </div>

                <div className="rounded-[4px] bg-mk-alabaster/70 p-2.5 transition-all focus-within:bg-white focus-within:ring-1 focus-within:ring-mk-gold dark:bg-mk-elevated dark:focus-within:bg-mk-charcoal">
                  <div className="mb-1 flex items-center justify-between">
                    <label
                      htmlFor="bloodPressure"
                      className="text-[9px] font-bold uppercase tracking-[0.16em] text-mk-stone dark:text-mk-stone-dark"
                    >
                      Pressão (PA)
                    </label>
                    <span className="text-[10px] font-semibold text-mk-gold-text dark:text-mk-gold">
                      MMHG
                    </span>
                  </div>
                  <input
                    id="bloodPressure"
                    type="text"
                    value={assessmentForm.bloodPressure ?? ''}
                    onChange={(e) =>
                      setAssessmentForm((prev) => ({
                        ...prev,
                        bloodPressure: e.target.value || null,
                      }))
                    }
                    placeholder="120/80"
                    className="w-full bg-transparent font-serif text-base font-semibold tracking-wide text-black focus:outline-none dark:text-mk-ivory"
                  />
                </div>

                <div className="rounded-[4px] bg-mk-alabaster/70 p-2.5 transition-all focus-within:bg-white focus-within:ring-1 focus-within:ring-mk-gold dark:bg-mk-elevated dark:focus-within:bg-mk-charcoal">
                  <div className="mb-1 flex items-center justify-between">
                    <label
                      htmlFor="restingHeartRate"
                      className="text-[9px] font-bold uppercase tracking-[0.16em] text-mk-stone dark:text-mk-stone-dark"
                    >
                      FC Repouso
                    </label>
                    <span className="text-[10px] font-semibold text-mk-gold-text dark:text-mk-gold">
                      BPM
                    </span>
                  </div>
                  <input
                    id="restingHeartRate"
                    type="number"
                    inputMode="numeric"
                    value={assessmentForm.restingHeartRate ?? ''}
                    onChange={(e) =>
                      setAssessmentForm((prev) => ({
                        ...prev,
                        restingHeartRate: parseOptionalNumber(e.target.value),
                      }))
                    }
                    placeholder="—"
                    className="w-full bg-transparent font-serif text-base font-semibold tracking-wide text-black focus:outline-none dark:text-mk-ivory"
                  />
                </div>
              </div>

              {/* Professional Notes Textarea */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="professionalNotes"
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-mk-stone dark:text-mk-stone-dark"
                  >
                    <ClipboardList className="h-3.5 w-3.5 text-mk-gold-text dark:text-mk-gold" />
                    Observações do Profissional Responsável
                  </label>
                  <span className="font-mono text-[9px] text-mk-stone dark:text-mk-stone-dark">
                    {notesLength}/5000
                  </span>
                </div>

                <textarea
                  id="professionalNotes"
                  rows={4}
                  maxLength={5000}
                  value={assessmentForm.professionalNotes ?? ''}
                  onChange={(e) =>
                    setAssessmentForm((prev) => ({
                      ...prev,
                      professionalNotes: e.target.value || null,
                    }))
                  }
                  placeholder="Anote restrições de exercícios, postura, preferências de horário ou plano inicial..."
                  className="w-full resize-y rounded-[4px] bg-mk-alabaster/70 p-3 text-xs leading-relaxed text-black transition-all placeholder:text-mk-stone/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-mk-gold dark:bg-mk-elevated dark:text-mk-ivory dark:placeholder:text-mk-stone-dark/60 dark:focus:bg-mk-charcoal"
                />
              </div>

              {/* Full-Width Gold Save CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingAssessment}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[4px] bg-mk-gold text-xs font-bold uppercase tracking-[0.2em] text-black shadow-xs transition-all hover:bg-mk-gold-hover active:scale-[0.99] disabled:opacity-60"
                >
                  {savingAssessment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{savingAssessment ? 'Salvando...' : 'Salvar Avaliação'}</span>
                </button>
              </div>
            </form>
          </section>
        )}

        {/* TAB 2: HISTÓRICO MÉDICO */}
        {activeTab === 'medical' && anamnesis && (
          <div className="space-y-5 rounded-[4px] bg-white p-5 shadow-[0_2px_14px_rgba(0,0,0,0.04)] dark:border dark:border-white/12 dark:bg-mk-charcoal">
            <section className="space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-mk-gold-text dark:text-mk-gold">
                Condições atuais
              </h3>
              <AnswerRow
                label="Doença diagnosticada"
                item={anamnesis.medicalHistory.currentConditions.diagnosedDisease}
              />
              <AnswerRow
                label="Problema cardíaco"
                item={anamnesis.medicalHistory.currentConditions.heartProblem}
              />
              <AnswerRow
                label="Pressão arterial alta ou baixa"
                item={anamnesis.medicalHistory.currentConditions.bloodPressureIssue}
              />
              <AnswerRow
                label="Diabetes"
                item={anamnesis.medicalHistory.currentConditions.diabetes}
              />
              <AnswerRow
                label="Problemas respiratórios"
                item={anamnesis.medicalHistory.currentConditions.respiratoryProblem}
              />
              <AnswerRow
                label="Problemas articulares"
                item={anamnesis.medicalHistory.currentConditions.jointProblem}
              />
              <AnswerRow
                label="Problemas na coluna"
                item={anamnesis.medicalHistory.currentConditions.spineProblem}
              />
              <AnswerRow
                label="Dores frequentes"
                item={anamnesis.medicalHistory.currentConditions.frequentPain}
              />
              <AnswerRow
                label="Tontura ou desmaios"
                item={anamnesis.medicalHistory.currentConditions.dizzinessOrFainting}
              />
              <AnswerRow
                label="Falta de ar durante atividades físicas"
                item={anamnesis.medicalHistory.currentConditions.shortnessOfBreathDuringExercise}
              />
              <AnswerRow
                label="Outra condição de saúde"
                item={anamnesis.medicalHistory.currentConditions.otherHealthCondition}
              />
            </section>

            <section className="space-y-2 border-t border-mk-hairline pt-4 dark:border-white/10">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-mk-gold-text dark:text-mk-gold">
                Histórico de lesões
              </h3>
              <AnswerRow label="Fratura" item={anamnesis.medicalHistory.injuryHistory.fracture} />
              <AnswerRow
                label="Luxação"
                item={anamnesis.medicalHistory.injuryHistory.dislocation}
              />
              <AnswerRow
                label="Lesão muscular"
                item={anamnesis.medicalHistory.injuryHistory.muscleInjury}
              />
              <AnswerRow
                label="Lesão ligamentar"
                item={anamnesis.medicalHistory.injuryHistory.ligamentInjury}
              />
              <AnswerRow
                label="Limitação de movimento"
                item={anamnesis.medicalHistory.injuryHistory.movementLimitation}
              />
              <AnswerRow
                label="Dores durante movimentos específicos"
                item={anamnesis.medicalHistory.injuryHistory.painDuringSpecificMovements}
              />
              <AnswerRow
                label="Cirurgia ou procedimento médico"
                item={anamnesis.medicalHistory.injuryHistory.surgeryOrMedicalProcedure}
              />
              <AnswerRow
                label="Já interrompeu atividades físicas por saúde"
                item={anamnesis.medicalHistory.injuryHistory.stoppedExerciseForHealthReason}
              />
              <AnswerRow
                label="Restrição médica para exercícios físicos"
                item={anamnesis.medicalHistory.injuryHistory.medicalRestrictionForExercise}
              />
            </section>

            <section className="space-y-2 border-t border-mk-hairline pt-4 dark:border-white/10">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-mk-gold-text dark:text-mk-gold">
                Medicamentos e acompanhamento
              </h3>
              <BoolRow
                label="Utiliza medicamento atualmente"
                value={anamnesis.medicalHistory.medicationsAndCare.usesMedication}
              />
              {anamnesis.medicalHistory.medicationsAndCare.medicationsList && (
                <div className="rounded-[4px] border border-amber-300 bg-[#FFFDF5] p-3 text-sm text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/35 dark:text-amber-100">
                  <strong>Medicamentos:</strong>{' '}
                  {anamnesis.medicalHistory.medicationsAndCare.medicationsList}
                </div>
              )}
              <BoolRow
                label="Acompanhamento médico regular"
                value={anamnesis.medicalHistory.medicationsAndCare.regularMedicalFollowUp}
              />
              <BoolRow
                label="Acompanhamento com fisioterapeuta"
                value={anamnesis.medicalHistory.medicationsAndCare.physiotherapyFollowUp}
              />
              <AnswerRow
                label="Recomendação ou restrição médica"
                item={anamnesis.medicalHistory.medicationsAndCare.medicalRecommendationOrRestriction}
              />
              <BoolRow
                label="Possui exames recentes"
                value={anamnesis.medicalHistory.medicationsAndCare.hasRecentHealthExams}
              />
            </section>

            <section className="space-y-2 border-t border-mk-hairline pt-4 dark:border-white/10">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-mk-gold-text dark:text-mk-gold">
                Histórico familiar &amp; Hábitos de vida
              </h3>
              <BoolRow
                label="Histórico familiar — Doenças cardíacas"
                value={anamnesis.medicalHistory.familyHistory.heartDisease}
              />
              <BoolRow
                label="Histórico familiar — Diabetes"
                value={anamnesis.medicalHistory.familyHistory.diabetes}
              />
              <BoolRow
                label="Histórico familiar — Hipertensão"
                value={anamnesis.medicalHistory.familyHistory.hypertension}
              />
              <AnswerRow
                label="Histórico familiar — Doenças hereditárias"
                item={anamnesis.medicalHistory.familyHistory.hereditaryDiseases}
              />
              {anamnesis.medicalHistory.familyHistory.otherRelevantHistory && (
                <div className="rounded-[4px] border border-mk-hairline p-3 text-sm text-black dark:border-white/10 dark:text-mk-ivory">
                  <strong>Outro histórico familiar:</strong>{' '}
                  {anamnesis.medicalHistory.familyHistory.otherRelevantHistory}
                </div>
              )}
              <div className="grid gap-2 pt-2 sm:grid-cols-3">
                <div className="rounded-[4px] bg-mk-alabaster p-3 text-xs dark:bg-mk-elevated">
                  <p className="text-mk-stone dark:text-mk-stone-dark">Qualidade do sono</p>
                  <p className="mt-0.5 text-sm font-bold text-black dark:text-mk-ivory">
                    {SLEEP_QUALITY_LABELS[anamnesis.medicalHistory.lifestyleHabits.sleepQuality]} (
                    {anamnesis.medicalHistory.lifestyleHabits.sleepHoursPerNight}h/noite)
                  </p>
                </div>
                <div className="rounded-[4px] bg-mk-alabaster p-3 text-xs dark:bg-mk-elevated">
                  <p className="text-mk-stone dark:text-mk-stone-dark">Nível de estresse</p>
                  <p className="mt-0.5 text-sm font-bold text-black dark:text-mk-ivory">
                    {STRESS_LEVEL_LABELS[anamnesis.medicalHistory.lifestyleHabits.stressLevel]}
                  </p>
                </div>
                <div className="rounded-[4px] bg-mk-alabaster p-3 text-xs dark:bg-mk-elevated">
                  <p className="text-mk-stone dark:text-mk-stone-dark">Tabagismo / Álcool</p>
                  <p className="mt-0.5 text-sm font-bold text-black dark:text-mk-ivory">
                    Fuma: {anamnesis.medicalHistory.lifestyleHabits.smokes ? 'Sim' : 'Não'} • Álcool
                    freq.:{' '}
                    {anamnesis.medicalHistory.lifestyleHabits.frequentAlcoholConsumption
                      ? 'Sim'
                      : 'Não'}
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: ATIVIDADE FÍSICA & OBJETIVOS */}
        {activeTab === 'activity' && anamnesis && (
          <div className="space-y-5 rounded-[4px] bg-white p-5 shadow-[0_2px_14px_rgba(0,0,0,0.04)] dark:border dark:border-white/12 dark:bg-mk-charcoal">
            <section className="space-y-2.5">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-mk-gold-text dark:text-mk-gold">
                4. Histórico de atividade física
              </h3>
              <BoolRow
                label="Já praticou musculação?"
                value={anamnesis.physicalActivityHistory.practicedWeightTraining}
              />
              {anamnesis.physicalActivityHistory.weightTrainingDuration && (
                <p className="text-sm text-black dark:text-mk-ivory">
                  <strong>Tempo de prática:</strong>{' '}
                  {anamnesis.physicalActivityHistory.weightTrainingDuration}
                </p>
              )}
              <BoolRow
                label="Atualmente pratica atividade física?"
                value={anamnesis.physicalActivityHistory.currentlyActive}
              />
              {anamnesis.physicalActivityHistory.currentlyActive ? (
                <p className="text-sm text-black dark:text-mk-ivory">
                  <strong>Atividade atual:</strong>{' '}
                  {anamnesis.physicalActivityHistory.currentActivity || '—'} (
                  {anamnesis.physicalActivityHistory.currentWeeklyFrequency ?? '—'}x/semana)
                </p>
              ) : (
                <p className="text-sm text-black dark:text-mk-ivory">
                  <strong>Tempo sem treinar:</strong>{' '}
                  {anamnesis.physicalActivityHistory.timeInactive || 'Não informado'}
                </p>
              )}
              <AnswerRow
                label="Experiência negativa durante exercícios"
                item={anamnesis.physicalActivityHistory.negativeExperienceDuringExercise}
              />
            </section>

            <section className="space-y-2.5 border-t border-mk-hairline pt-4 dark:border-white/10">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-mk-gold-text dark:text-mk-gold">
                5. Objetivos e expectativas
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[4px] bg-mk-alabaster p-3.5 text-sm dark:bg-mk-elevated">
                  <p className="text-xs text-mk-stone dark:text-mk-stone-dark">Objetivo principal</p>
                  <p className="mt-0.5 font-bold text-black dark:text-mk-ivory">
                    {anamnesis.primaryGoal === 'OTHER' && anamnesis.primaryGoalOther
                      ? anamnesis.primaryGoalOther
                      : PRIMARY_GOAL_LABELS[anamnesis.primaryGoal]}
                  </p>
                </div>
                <div className="rounded-[4px] bg-mk-alabaster p-3.5 text-sm dark:bg-mk-elevated">
                  <p className="text-xs text-mk-stone dark:text-mk-stone-dark">
                    Objetivo secundário
                  </p>
                  <p className="mt-0.5 font-semibold text-black dark:text-mk-ivory">
                    {anamnesis.secondaryGoal || '—'}
                  </p>
                </div>
                <div className="rounded-[4px] bg-mk-alabaster p-3.5 text-sm dark:bg-mk-elevated">
                  <p className="text-xs text-mk-stone dark:text-mk-stone-dark">
                    Região de maior atenção
                  </p>
                  <p className="mt-0.5 font-semibold text-black dark:text-mk-ivory">
                    {anamnesis.focusBodyArea || '—'}
                  </p>
                </div>
                <div className="rounded-[4px] bg-mk-alabaster p-3.5 text-sm dark:bg-mk-elevated">
                  <p className="text-xs text-mk-stone dark:text-mk-stone-dark">
                    Frequência pretendida
                  </p>
                  <p className="mt-0.5 font-bold text-black dark:text-mk-ivory">
                    {anamnesis.intendedWeeklyFrequency}x por semana
                  </p>
                </div>
              </div>
              <div className="rounded-[4px] bg-mk-alabaster p-3.5 text-sm dark:bg-mk-elevated">
                <p className="text-xs text-mk-stone dark:text-mk-stone-dark">
                  Disponibilidade semanal
                </p>
                <p className="mt-0.5 font-semibold text-black dark:text-mk-ivory">
                  {anamnesis.weeklyAvailability}
                </p>
              </div>
            </section>
          </div>
        )}

        {/* TAB 4: DADOS PESSOAIS, ENDEREÇO & CONTATO DE EMERGÊNCIA */}
        {activeTab === 'personal' && studentForm && (
          <div className="rounded-[4px] bg-white p-5 shadow-[0_2px_14px_rgba(0,0,0,0.04)] dark:border dark:border-white/12 dark:bg-mk-charcoal">
            <div className="flex items-center justify-between gap-2 border-b border-mk-hairline pb-4 dark:border-white/10">
              <h3 className="font-serif text-lg font-semibold text-black dark:text-mk-ivory">
                Dados Pessoais, Endereço e Emergência
              </h3>
              <button
                type="button"
                onClick={() => setEditingStudent((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-[4px] border border-mk-hairline px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-black hover:border-black dark:border-white/15 dark:text-mk-ivory dark:hover:border-mk-gold"
              >
                {editingStudent ? (
                  <>
                    <X className="h-3.5 w-3.5" />
                    Cancelar
                  </>
                ) : (
                  <>
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </>
                )}
              </button>
            </div>

            {editingStudent ? (
              <form onSubmit={handleSaveStudent} className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={LABEL_CLASS}>Nome completo</label>
                    <input
                      type="text"
                      required
                      value={studentForm.fullName}
                      onChange={(e) =>
                        setStudentForm((prev) => prev && { ...prev, fullName: e.target.value })
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>WhatsApp</label>
                    <input
                      type="tel"
                      required
                      value={studentForm.phone}
                      onChange={(e) =>
                        setStudentForm(
                          (prev) => prev && { ...prev, phone: formatPhone(e.target.value) },
                        )
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Data de nascimento</label>
                    <input
                      type="date"
                      required
                      value={studentForm.birthDate}
                      onChange={(e) =>
                        setStudentForm((prev) => prev && { ...prev, birthDate: e.target.value })
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Sexo</label>
                    <select
                      value={studentForm.gender}
                      onChange={(e) =>
                        setStudentForm(
                          (prev) => prev && { ...prev, gender: e.target.value as Gender },
                        )
                      }
                      className={INPUT_CLASS}
                    >
                      {(Object.keys(GENDER_LABELS) as Gender[]).map((g) => (
                        <option key={g} value={g}>
                          {GENDER_LABELS[g]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 border-t border-mk-hairline pt-4 sm:grid-cols-3 dark:border-white/10">
                  <div>
                    <label className={LABEL_CLASS}>Contato de emergência</label>
                    <input
                      type="text"
                      required
                      value={studentForm.emergencyContact.fullName}
                      onChange={(e) =>
                        setStudentForm(
                          (prev) =>
                            prev && {
                              ...prev,
                              emergencyContact: {
                                ...prev.emergencyContact,
                                fullName: e.target.value,
                              },
                            },
                        )
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Parentesco</label>
                    <input
                      type="text"
                      required
                      value={studentForm.emergencyContact.relationship}
                      onChange={(e) =>
                        setStudentForm(
                          (prev) =>
                            prev && {
                              ...prev,
                              emergencyContact: {
                                ...prev.emergencyContact,
                                relationship: e.target.value,
                              },
                            },
                        )
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Telefone emergência</label>
                    <input
                      type="tel"
                      required
                      value={studentForm.emergencyContact.phone}
                      onChange={(e) =>
                        setStudentForm(
                          (prev) =>
                            prev && {
                              ...prev,
                              emergencyContact: {
                                ...prev.emergencyContact,
                                phone: formatPhone(e.target.value),
                              },
                            },
                        )
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingStudent}
                    className="inline-flex items-center gap-2 rounded-[4px] bg-mk-gold px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-black hover:bg-mk-gold-hover disabled:opacity-60"
                  >
                    {savingStudent ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar alterações
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 space-y-4 text-sm text-black dark:text-mk-ivory">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-mk-stone dark:text-mk-stone-dark">E-mail</p>
                    <p className="font-medium">{student.email || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-mk-stone dark:text-mk-stone-dark">WhatsApp</p>
                    <p className="font-medium">{formatPhone(student.phone)}</p>
                  </div>
                </div>

                <div className="border-t border-mk-hairline pt-3 dark:border-white/10">
                  <p className="text-xs text-mk-stone dark:text-mk-stone-dark">Endereço</p>
                  <p className="mt-0.5 font-medium">
                    {student.address.street}, {student.address.number}
                    {student.address.complement ? ` — ${student.address.complement}` : ''}
                  </p>
                  <p className="text-xs text-mk-stone dark:text-mk-stone-dark">
                    {student.address.neighborhood} • {student.address.city}/{student.address.state}{' '}
                    • CEP {formatZipCode(student.address.zipCode)}
                  </p>
                </div>

                <div className="rounded-[4px] border border-rose-300 bg-rose-50/70 p-3.5 dark:border-rose-800/60 dark:bg-rose-950/35">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-800 dark:text-rose-300">
                    Contato de Emergência
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-black dark:text-mk-ivory">
                        {student.emergencyContact.fullName} ({student.emergencyContact.relationship}
                        )
                      </p>
                      <p className="text-xs text-mk-stone dark:text-mk-stone-dark">
                        {formatPhone(student.emergencyContact.phone)}
                      </p>
                    </div>
                    <a
                      href={`tel:${student.emergencyContact.phone}`}
                      className="inline-flex items-center gap-1.5 rounded-[4px] bg-rose-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-rose-700"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Ligar
                    </a>
                  </div>
                </div>

                <div className="border-t border-mk-hairline pt-4 dark:border-white/10">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDelete}
                    className="inline-flex items-center gap-1.5 rounded-[4px] border border-rose-300 bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-800/60 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deleting ? 'Excluindo...' : 'Excluir cadastro do aluno'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: TERMO, LGPD & ASSINATURA */}
        {activeTab === 'consent' && anamnesis && (
          <div className="space-y-4 rounded-[4px] bg-white p-5 shadow-[0_2px_14px_rgba(0,0,0,0.04)] dark:border dark:border-white/12 dark:bg-mk-charcoal">
            <div className="flex items-center gap-2 border-b border-mk-hairline pb-4 dark:border-white/10">
              <ShieldCheck className="h-5 w-5 text-mk-gold-text dark:text-mk-gold" />
              <h3 className="font-serif text-lg font-semibold text-black dark:text-mk-ivory">
                Termo de Responsabilidade, LGPD e Assinatura
              </h3>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-[4px] bg-mk-alabaster p-3 dark:bg-mk-elevated">
                <p className="text-xs text-mk-stone dark:text-mk-stone-dark">Assinante</p>
                <p className="font-bold text-black dark:text-mk-ivory">
                  {anamnesis.consent.signerName}
                </p>
              </div>
              <div className="rounded-[4px] bg-mk-alabaster p-3 dark:bg-mk-elevated">
                <p className="text-xs text-mk-stone dark:text-mk-stone-dark">
                  Data e hora do aceite
                </p>
                <p className="font-bold text-black dark:text-mk-ivory">
                  {formatDateTimeBR(anamnesis.consent.signedAt)} (Versão{' '}
                  {anamnesis.consent.termsVersion})
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs font-medium text-emerald-900 dark:text-emerald-200">
              <p className="rounded-[4px] border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800/60 dark:bg-emerald-950/40">
                ✓ Termo de Responsabilidade MK STUDIO aceito.
              </p>
              <p className="rounded-[4px] border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800/60 dark:bg-emerald-950/40">
                ✓ Consentimento LGPD para dados pessoais e dados de saúde autorizado.
              </p>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-mk-stone dark:text-mk-stone-dark">
                Assinatura capturada
              </p>
              <div className="overflow-hidden rounded-[4px] border border-mk-gold/50 bg-[#FAF7F0] p-3">
                <img
                  src={anamnesis.consent.signatureImage}
                  alt={`Assinatura de ${anamnesis.consent.signerName}`}
                  className="max-h-44 w-auto object-contain"
                />
              </div>
            </div>
          </div>
        )}

        {/* Editorial Last Update Snapshot (Real Backend Timestamp) */}
        {anamnesis && (
          <section className="flex items-center justify-between rounded-[4px] bg-white p-4 shadow-[0_1px_6px_rgba(0,0,0,0.03)] dark:border dark:border-white/10 dark:bg-mk-charcoal">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mk-alabaster text-mk-gold-text dark:bg-mk-elevated dark:text-mk-gold">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-black dark:text-mk-ivory">
                  Última Atualização da Ficha
                </p>
                <p className="text-[10px] text-mk-stone dark:text-mk-stone-dark">
                  Sincronizada com a anamnese MK STUDIO
                </p>
              </div>
            </div>
            <span className="rounded-[3px] bg-mk-alabaster px-2 py-1 font-mono text-[10px] text-mk-stone dark:bg-mk-elevated dark:text-mk-stone-dark">
              {formatDateTimeBR(anamnesis.updatedAt)}
            </span>
          </section>
        )}

        {/* Editorial Footer Note */}
        <footer className="space-y-1.5 pb-2 pt-4 text-center">
          <div className="flex items-center justify-center gap-2 text-mk-gold-text/60 dark:text-mk-gold/60">
            <span className="h-px w-6 bg-mk-gold/40" />
            <Sparkles className="h-3 w-3" />
            <span className="h-px w-6 bg-mk-gold/40" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black dark:text-mk-ivory">
            MK STUDIO • Protocolo Privativo • Piracaia — SP
          </p>
          <p className="text-[9px] uppercase tracking-[0.18em] text-mk-stone dark:text-mk-stone-dark">
            Sistema Exclusivo de Gestão e Condicionamento Individualizado
          </p>
        </footer>
      </main>
    </div>
  )
}
