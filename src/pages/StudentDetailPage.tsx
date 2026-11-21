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

function AnswerRow({ label, item }: { label: string; item: YesNoDetail }) {
  return (
    <div
      className={`rounded-xl border p-3 text-sm ${
        item.answer
          ? 'border-amber-200 bg-amber-50/70 text-amber-950'
          : 'border-slate-200 bg-white text-slate-700'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
            item.answer ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {item.answer ? 'Sim' : 'Não'}
        </span>
      </div>
      {item.answer && item.details && (
        <p className="mt-1.5 text-xs font-medium text-amber-900">Detalhe: {item.details}</p>
      )}
    </div>
  )
}

function BoolRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
      <span>{label}</span>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
          value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="mt-2 text-sm">Carregando ficha...</p>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12 text-center">
        <p className="text-sm text-rose-700">{error || 'Aluno não encontrado.'}</p>
        <Link
          to="/alunos"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
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
    <div className="min-h-screen bg-slate-50 pb-14">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3.5">
          <Link
            to="/alunos"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Alunos
          </Link>

          <a
            href={buildWhatsAppUrl(
              student.phone,
              `Olá ${student.fullName.split(' ')[0]}, tudo bem? Aqui é do MK STUDIO!`,
            )}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 sm:text-sm"
          >
            <MessageCircle className="h-4 w-4" />
            Chamar no WhatsApp
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 pt-6">
        {feedback && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Student Header Card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900">{student.fullName}</h1>
                <StatusBadge status={student.status} />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {student.age} anos ({formatDateBR(student.birthDate)}) •{' '}
                {GENDER_LABELS[student.gender]} • {formatPhone(student.phone)}
              </p>
              {anamnesis && (
                <p className="mt-2 text-xs font-medium text-slate-600">
                  Objetivo:{' '}
                  <strong>
                    {anamnesis.primaryGoal === 'OTHER' && anamnesis.primaryGoalOther
                      ? anamnesis.primaryGoalOther
                      : PRIMARY_GOAL_LABELS[anamnesis.primaryGoal]}
                  </strong>{' '}
                  • Frequência pretendida: <strong>{anamnesis.intendedWeeklyFrequency}x/sem</strong>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['NEW', 'ACTIVE', 'INACTIVE'] as StudentStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange(s)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                    student.status === s
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
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
          <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider">
                Alertas de Saúde e Lesões ({anamnesis.healthAlerts.length})
              </h2>
            </div>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm font-medium text-amber-950">
              {anamnesis.healthAlerts.map((alert, idx) => (
                <li key={idx}>{alert}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Navigation Tabs */}
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
              className={`shrink-0 rounded-xl border px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${
                activeTab === tab.id
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: AVALIAÇÃO FÍSICA & OBSERVAÇÕES DO PROFISSIONAL */}
        {activeTab === 'assessment' && anamnesis && (
          <form
            onSubmit={handleSaveAssessment}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  6. Informações Físicas e Avaliação
                </h2>
                <p className="text-xs text-slate-500">
                  Complemente ou atualize as medidas e observações profissionais deste aluno.
                </p>
              </div>
              {bmi && (
                <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800">
                  IMC estimado: {bmi}
                </span>
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Peso atual (kg)
                </label>
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
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Altura (cm)</label>
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
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  % Gordura corporal
                </label>
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
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Massa muscular (kg)
                </label>
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
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Pressão arterial
                </label>
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
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  FC em repouso (bpm)
                </label>
                <input
                  type="number"
                  value={assessmentForm.restingHeartRate ?? ''}
                  onChange={(e) =>
                    setAssessmentForm((prev) => ({
                      ...prev,
                      restingHeartRate: parseOptionalNumber(e.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                Observações do profissional responsável
              </label>
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
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={savingAssessment}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
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
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
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

            <section className="space-y-2 border-t border-slate-200 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
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

            <section className="space-y-2 border-t border-slate-200 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Medicamentos e acompanhamento
              </h3>
              <BoolRow
                label="Utiliza medicamento atualmente"
                value={anamnesis.medicalHistory.medicationsAndCare.usesMedication}
              />
              {anamnesis.medicalHistory.medicationsAndCare.medicationsList && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
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

            <section className="space-y-2 border-t border-slate-200 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Histórico familiar & Hábitos de vida
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
                <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                  <strong>Outro histórico familiar:</strong>{' '}
                  {anamnesis.medicalHistory.familyHistory.otherRelevantHistory}
                </div>
              )}
              <div className="grid gap-2 pt-2 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3 text-xs">
                  <p className="text-slate-500">Qualidade do sono</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">
                    {SLEEP_QUALITY_LABELS[anamnesis.medicalHistory.lifestyleHabits.sleepQuality]} (
                    {anamnesis.medicalHistory.lifestyleHabits.sleepHoursPerNight}h/noite)
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-xs">
                  <p className="text-slate-500">Nível de estresse</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">
                    {STRESS_LEVEL_LABELS[anamnesis.medicalHistory.lifestyleHabits.stressLevel]}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-xs">
                  <p className="text-slate-500">Tabagismo / Álcool</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">
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
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <section className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                4. Histórico de atividade física
              </h3>
              <BoolRow
                label="Já praticou musculação?"
                value={anamnesis.physicalActivityHistory.practicedWeightTraining}
              />
              {anamnesis.physicalActivityHistory.weightTrainingDuration && (
                <p className="text-sm text-slate-700">
                  <strong>Tempo de prática:</strong>{' '}
                  {anamnesis.physicalActivityHistory.weightTrainingDuration}
                </p>
              )}
              <BoolRow
                label="Atualmente pratica atividade física?"
                value={anamnesis.physicalActivityHistory.currentlyActive}
              />
              {anamnesis.physicalActivityHistory.currentlyActive ? (
                <p className="text-sm text-slate-700">
                  <strong>Atividade atual:</strong>{' '}
                  {anamnesis.physicalActivityHistory.currentActivity || '—'} (
                  {anamnesis.physicalActivityHistory.currentWeeklyFrequency ?? '—'}x/semana)
                </p>
              ) : (
                <p className="text-sm text-slate-700">
                  <strong>Tempo sem treinar:</strong>{' '}
                  {anamnesis.physicalActivityHistory.timeInactive || 'Não informado'}
                </p>
              )}
              <AnswerRow
                label="Experiência negativa durante exercícios"
                item={anamnesis.physicalActivityHistory.negativeExperienceDuringExercise}
              />
            </section>

            <section className="space-y-2.5 border-t border-slate-200 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                5. Objetivos e expectativas
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3.5 text-sm">
                  <p className="text-xs text-slate-500">Objetivo principal</p>
                  <p className="mt-0.5 font-bold text-slate-900">
                    {anamnesis.primaryGoal === 'OTHER' && anamnesis.primaryGoalOther
                      ? anamnesis.primaryGoalOther
                      : PRIMARY_GOAL_LABELS[anamnesis.primaryGoal]}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5 text-sm">
                  <p className="text-xs text-slate-500">Objetivo secundário</p>
                  <p className="mt-0.5 font-semibold text-slate-900">
                    {anamnesis.secondaryGoal || '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5 text-sm">
                  <p className="text-xs text-slate-500">Região de maior atenção</p>
                  <p className="mt-0.5 font-semibold text-slate-900">
                    {anamnesis.focusBodyArea || '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5 text-sm">
                  <p className="text-xs text-slate-500">Frequência pretendida</p>
                  <p className="mt-0.5 font-bold text-slate-900">
                    {anamnesis.intendedWeeklyFrequency}x por semana
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5 text-sm">
                <p className="text-xs text-slate-500">Disponibilidade semanal</p>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {anamnesis.weeklyAvailability}
                </p>
              </div>
            </section>
          </div>
        )}

        {/* TAB 4: DADOS PESSOAIS, ENDEREÇO & CONTATO DE EMERGÊNCIA */}
        {activeTab === 'personal' && studentForm && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Dados Pessoais, Endereço e Emergência
              </h2>
              <button
                type="button"
                onClick={() => setEditingStudent((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Nome completo
                    </label>
                    <input
                      type="text"
                      required
                      value={studentForm.fullName}
                      onChange={(e) =>
                        setStudentForm((prev) => prev && { ...prev, fullName: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      WhatsApp
                    </label>
                    <input
                      type="tel"
                      required
                      value={studentForm.phone}
                      onChange={(e) =>
                        setStudentForm(
                          (prev) => prev && { ...prev, phone: formatPhone(e.target.value) },
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Data de nascimento
                    </label>
                    <input
                      type="date"
                      required
                      value={studentForm.birthDate}
                      onChange={(e) =>
                        setStudentForm((prev) => prev && { ...prev, birthDate: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Sexo</label>
                    <select
                      value={studentForm.gender}
                      onChange={(e) =>
                        setStudentForm(
                          (prev) => prev && { ...prev, gender: e.target.value as Gender },
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      {(Object.keys(GENDER_LABELS) as Gender[]).map((g) => (
                        <option key={g} value={g}>
                          {GENDER_LABELS[g]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Contato de emergência
                    </label>
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
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Parentesco
                    </label>
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
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Telefone emergência
                    </label>
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
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingStudent}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
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
              <div className="mt-4 space-y-4 text-sm text-slate-700">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">E-mail</p>
                    <p className="font-medium text-slate-900">{student.email || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">WhatsApp</p>
                    <p className="font-medium text-slate-900">{formatPhone(student.phone)}</p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <p className="text-xs text-slate-500">Endereço</p>
                  <p className="mt-0.5 font-medium text-slate-900">
                    {student.address.street}, {student.address.number}
                    {student.address.complement ? ` — ${student.address.complement}` : ''}
                  </p>
                  <p className="text-xs text-slate-600">
                    {student.address.neighborhood} • {student.address.city}/{student.address.state}{' '}
                    • CEP {formatZipCode(student.address.zipCode)}
                  </p>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-800">
                    Contato de Emergência
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900">
                        {student.emergencyContact.fullName} ({student.emergencyContact.relationship}
                        )
                      </p>
                      <p className="text-xs text-slate-600">
                        {formatPhone(student.emergencyContact.phone)}
                      </p>
                    </div>
                    <a
                      href={`tel:${student.emergencyContact.phone}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Ligar
                    </a>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDelete}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
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
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
              <h2 className="text-base font-bold text-slate-900">
                Termo de Responsabilidade, LGPD e Assinatura
              </h2>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Assinante</p>
                <p className="font-bold text-slate-900">{anamnesis.consent.signerName}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Data e hora do aceite</p>
                <p className="font-bold text-slate-900">
                  {formatDateTimeBR(anamnesis.consent.signedAt)} (Versão{' '}
                  {anamnesis.consent.termsVersion})
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs font-medium text-emerald-800">
              <p className="rounded-lg bg-emerald-50 px-3 py-2">
                ✓ Termo de Responsabilidade MK STUDIO aceito.
              </p>
              <p className="rounded-lg bg-emerald-50 px-3 py-2">
                ✓ Consentimento LGPD para dados pessoais e dados de saúde autorizado.
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Assinatura capturada
              </p>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3">
                <img
                  src={anamnesis.consent.signatureImage}
                  alt={`Assinatura de ${anamnesis.consent.signerName}`}
                  className="max-h-44 w-auto object-contain"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
