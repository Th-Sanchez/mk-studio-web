import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge'
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
  'mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-mk-stone dark:text-mk-stone-dark'

function AnswerRow({ label, item }: { label: string; item: YesNoDetail }) {
  return (
    <div
      className={`rounded-[4px] border p-3 text-sm ${
        item.answer
          ? 'border-amber-300 bg-[#FFFBEB] text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/35 dark:text-amber-100'
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
      showToast(`Status alterado para ${STATUS_LABELS[nextStatus]}.`)
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
      showToast('Avaliação física e observações salvas com sucesso!')
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
      showToast('Dados cadastrais atualizados!')
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
        <p className="mt-2 text-sm">Carregando ficha...</p>
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
  const bmi =
    assessmentForm.weightKg && assessmentForm.heightCm && assessmentForm.heightCm > 0
      ? (assessmentForm.weightKg / Math.pow(assessmentForm.heightCm / 100, 2)).toFixed(1)
      : null

  return (
    <div className="min-h-screen bg-mk-alabaster pb-14 transition-colors dark:bg-black">
      <header className="sticky top-0 z-20 border-b border-mk-hairline bg-white/95 backdrop-blur dark:border-white/12 dark:bg-black/95">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3.5">
          <Link
            to="/alunos"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-black hover:text-mk-gold-text dark:text-mk-ivory dark:hover:text-mk-gold"
          >
            <ArrowLeft className="h-4 w-4" />
            Alunos
          </Link>

          <div className="flex items-center gap-2">
            <a
              href={buildWhatsAppUrl(
                student.phone,
                `Olá ${student.fullName.split(' ')[0]}, tudo bem? Aqui é do MK STUDIO!`,
              )}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-[4px] bg-emerald-600 px-3 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-emerald-700 sm:px-3.5"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Chamar no WhatsApp</span>
              <span className="sm:hidden">WhatsApp</span>
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 pt-6">
        {feedback && (
          <div className="flex items-center gap-2 rounded-[4px] border border-emerald-300 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/50 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {error && (
          <div className="rounded-[4px] border border-rose-300 bg-rose-50 p-3.5 text-sm text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-200">
            {error}
          </div>
        )}

        {/* Student Header Card */}
        <section className="rounded-[4px] border border-mk-hairline bg-white p-5 shadow-2xs sm:p-6 dark:border-white/12 dark:bg-mk-charcoal">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-mk-gold-text dark:text-mk-gold">
                Dossiê do Aluno • Cadastro em {formatDateBR(student.createdAt)}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                <h1 className="font-serif text-2xl font-semibold text-black sm:text-3xl dark:text-mk-ivory">
                  {student.fullName}
                </h1>
                <StatusBadge status={student.status} />
              </div>
              <p className="mt-1.5 text-sm text-mk-stone dark:text-mk-stone-dark">
                {student.age} anos ({formatDateBR(student.birthDate)}) •{' '}
                {GENDER_LABELS[student.gender]} • {formatPhone(student.phone)}
              </p>
              {anamnesis && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-[3px] bg-mk-alabaster px-2.5 py-1 text-xs font-semibold text-black dark:bg-white/10 dark:text-mk-ivory">
                    {anamnesis.primaryGoal === 'OTHER' && anamnesis.primaryGoalOther
                      ? anamnesis.primaryGoalOther
                      : PRIMARY_GOAL_LABELS[anamnesis.primaryGoal]}
                  </span>
                  <span className="rounded-[3px] bg-mk-alabaster px-2.5 py-1 text-xs font-semibold text-black dark:bg-white/10 dark:text-mk-ivory">
                    {anamnesis.intendedWeeklyFrequency}x/semana
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['NEW', 'ACTIVE', 'INACTIVE'] as StudentStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange(s)}
                  className={`rounded-[4px] border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                    student.status === s
                      ? 'border-black bg-black text-white dark:border-mk-gold dark:bg-mk-gold dark:text-black'
                      : 'border-mk-hairline bg-white text-mk-stone hover:border-black hover:text-black dark:border-white/15 dark:bg-mk-elevated dark:text-mk-stone-dark dark:hover:border-mk-gold dark:hover:text-mk-ivory'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Health Alerts Banner */}
        {anamnesis && anamnesis.healthAlerts.length > 0 && (
          <section className="rounded-[4px] border border-amber-300 border-l-4 border-l-mk-gold bg-[#FFFDF5] p-4 sm:p-5 dark:border-amber-700/60 dark:border-l-mk-gold dark:bg-amber-950/35">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-mk-gold" />
              <h2 className="font-sans text-xs font-bold uppercase tracking-[0.16em]">
                Alertas de Saúde e Lesões ({anamnesis.healthAlerts.length})
              </h2>
            </div>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm font-medium text-amber-950 dark:text-amber-100">
              {anamnesis.healthAlerts.map((alert, idx) => (
                <li key={idx}>{alert}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Editorial Horizontal Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(
            [
              { id: 'assessment', label: 'Avaliação & Notas' },
              { id: 'medical', label: 'Histórico Médico' },
              { id: 'activity', label: 'Atividade & Objetivos' },
              { id: 'personal', label: 'Cadastro & Emergência' },
              { id: 'consent', label: 'Termo & Assinatura' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-[4px] border px-3.5 py-2 text-xs font-bold uppercase tracking-[0.1em] transition ${
                activeTab === tab.id
                  ? 'border-black bg-black text-white dark:border-mk-gold dark:bg-mk-gold dark:text-black'
                  : 'border-mk-hairline bg-white text-mk-stone hover:border-black hover:text-black dark:border-white/15 dark:bg-mk-charcoal dark:text-mk-stone-dark dark:hover:border-mk-gold dark:hover:text-mk-ivory'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: AVALIAÇÃO FÍSICA & OBSERVAÇÕES */}
        {activeTab === 'assessment' && anamnesis && (
          <form
            onSubmit={handleSaveAssessment}
            className="rounded-[4px] border border-mk-hairline bg-white p-5 shadow-2xs sm:p-6 dark:border-white/12 dark:bg-mk-charcoal"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mk-hairline pb-4 dark:border-white/10">
              <div>
                <h2 className="font-serif text-xl font-semibold text-black dark:text-mk-ivory">
                  6. Informações Físicas e Avaliação
                </h2>
                <p className="mt-0.5 text-xs text-mk-stone dark:text-mk-stone-dark">
                  Complemente ou atualize as medidas e observações profissionais deste aluno.
                </p>
              </div>
              {bmi && (
                <span className="rounded-[4px] border border-mk-gold/60 bg-[#FFF8E7] px-3 py-1.5 text-xs font-bold text-mk-gold-text dark:bg-mk-gold/15 dark:text-mk-gold">
                  IMC estimado: {bmi}
                </span>
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <label className={LABEL_CLASS}>Peso atual (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={assessmentForm.weightKg ?? ''}
                  onChange={(e) =>
                    setAssessmentForm((prev) => ({
                      ...prev,
                      weightKg: parseOptionalNumber(e.target.value),
                    }))
                  }
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Altura (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={assessmentForm.heightCm ?? ''}
                  onChange={(e) =>
                    setAssessmentForm((prev) => ({
                      ...prev,
                      heightCm: parseOptionalNumber(e.target.value),
                    }))
                  }
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>% Gordura corporal</label>
                <input
                  type="number"
                  step="0.1"
                  value={assessmentForm.bodyFatPercentage ?? ''}
                  onChange={(e) =>
                    setAssessmentForm((prev) => ({
                      ...prev,
                      bodyFatPercentage: parseOptionalNumber(e.target.value),
                    }))
                  }
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Massa muscular (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={assessmentForm.muscleMassKg ?? ''}
                  onChange={(e) =>
                    setAssessmentForm((prev) => ({
                      ...prev,
                      muscleMassKg: parseOptionalNumber(e.target.value),
                    }))
                  }
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Pressão arterial</label>
                <input
                  type="text"
                  value={assessmentForm.bloodPressure ?? ''}
                  onChange={(e) =>
                    setAssessmentForm((prev) => ({
                      ...prev,
                      bloodPressure: e.target.value || null,
                    }))
                  }
                  placeholder="120/80"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>FC em repouso (bpm)</label>
                <input
                  type="number"
                  value={assessmentForm.restingHeartRate ?? ''}
                  onChange={(e) =>
                    setAssessmentForm((prev) => ({
                      ...prev,
                      restingHeartRate: parseOptionalNumber(e.target.value),
                    }))
                  }
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="mt-5">
              <label className={LABEL_CLASS}>Observações do profissional responsável</label>
              <textarea
                rows={4}
                value={assessmentForm.professionalNotes ?? ''}
                onChange={(e) =>
                  setAssessmentForm((prev) => ({
                    ...prev,
                    professionalNotes: e.target.value || null,
                  }))
                }
                placeholder="Anote restrições de exercícios, postura, preferências de horário ou plano inicial..."
                className={INPUT_CLASS}
              />
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={savingAssessment}
                className="inline-flex items-center gap-2 rounded-[4px] bg-mk-gold px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-black transition hover:bg-mk-gold-hover disabled:opacity-60"
              >
                {savingAssessment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar Avaliação
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: HISTÓRICO MÉDICO */}
        {activeTab === 'medical' && anamnesis && (
          <div className="space-y-5 rounded-[4px] border border-mk-hairline bg-white p-5 shadow-2xs sm:p-6 dark:border-white/12 dark:bg-mk-charcoal">
            <section className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-mk-gold-text dark:text-mk-gold">
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
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-mk-gold-text dark:text-mk-gold">
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
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-mk-gold-text dark:text-mk-gold">
                Medicamentos e acompanhamento
              </h3>
              <BoolRow
                label="Utiliza medicamento atualmente"
                value={anamnesis.medicalHistory.medicationsAndCare.usesMedication}
              />
              {anamnesis.medicalHistory.medicationsAndCare.medicationsList && (
                <div className="rounded-[4px] border border-amber-300 bg-[#FFFBEB] p-3 text-sm text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/35 dark:text-amber-100">
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
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-mk-gold-text dark:text-mk-gold">
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
          <div className="space-y-5 rounded-[4px] border border-mk-hairline bg-white p-5 shadow-2xs sm:p-6 dark:border-white/12 dark:bg-mk-charcoal">
            <section className="space-y-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-mk-gold-text dark:text-mk-gold">
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
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-mk-gold-text dark:text-mk-gold">
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
          <div className="rounded-[4px] border border-mk-hairline bg-white p-5 shadow-2xs sm:p-6 dark:border-white/12 dark:bg-mk-charcoal">
            <div className="flex items-center justify-between gap-2 border-b border-mk-hairline pb-4 dark:border-white/10">
              <h2 className="font-serif text-xl font-semibold text-black dark:text-mk-ivory">
                Dados Pessoais, Endereço e Emergência
              </h2>
              <button
                type="button"
                onClick={() => setEditingStudent((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-[4px] border border-mk-hairline px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-black hover:border-black dark:border-white/15 dark:text-mk-ivory dark:hover:border-mk-gold"
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
          <div className="space-y-4 rounded-[4px] border border-mk-hairline bg-white p-5 shadow-2xs sm:p-6 dark:border-white/12 dark:bg-mk-charcoal">
            <div className="flex items-center gap-2 border-b border-mk-hairline pb-4 dark:border-white/10">
              <ShieldCheck className="h-5 w-5 text-mk-gold-text dark:text-mk-gold" />
              <h2 className="font-serif text-xl font-semibold text-black dark:text-mk-ivory">
                Termo de Responsabilidade, LGPD e Assinatura
              </h2>
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

        <p className="pt-4 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-mk-stone/80 dark:text-mk-stone-dark/70">
          MK STUDIO • Piracaia — SP
        </p>
      </main>
    </div>
  )
}
