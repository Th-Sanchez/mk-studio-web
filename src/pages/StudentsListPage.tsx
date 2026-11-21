import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Copy,
  Dumbbell,
  Loader2,
  LogOut,
  Search,
  Users,
} from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge'
import { ApiError } from '../services/api'
import { getStoredAdminUser, logoutAdmin } from '../services/authService'
import { fetchStudents, fetchStudentsSummary } from '../services/studentService'
import {
  PRIMARY_GOAL_LABELS,
  type PagedResponse,
  type StudentListItem,
  type StudentStatus,
  type StudentSummaryCounts,
} from '../types/anamnesis'
import { formatDateBR, formatPhone } from '../utils/formatters'

export function StudentsListPage() {
  const navigate = useNavigate()
  const adminUser = getStoredAdminUser()

  const [summary, setSummary] = useState<StudentSummaryCounts | null>(null)
  const [data, setData] = useState<PagedResponse<StudentListItem> | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StudentStatus | ''>('')
  const [onlyHealthAlerts, setOnlyHealthAlerts] = useState(false)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput)
      setPage(0)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summaryRes, listRes] = await Promise.all([
        fetchStudentsSummary(),
        fetchStudents({
          search: debouncedSearch,
          status: statusFilter,
          onlyHealthAlerts,
          page,
          size: 20,
        }),
      ])
      setSummary(summaryRes)
      setData(listRes)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logoutAdmin()
        navigate('/login', { replace: true })
        return
      }
      setError(err instanceof Error ? err.message : 'Erro ao carregar lista de alunos.')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, onlyHealthAlerts, page, navigate])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleCopyRegistrationLink() {
    const url = `${window.location.origin}/cadastro`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      window.prompt('Copie o link de auto-cadastro:', url)
    }
  }

  function handleLogout() {
    logoutAdmin()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Dumbbell className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 sm:text-base">MK STUDIO</h1>
              <p className="text-xs text-slate-500">{adminUser?.name || 'Painel do Personal'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyRegistrationLink}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 sm:px-3.5 sm:text-sm"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  Link copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Copiar link de cadastro</span>
                  <span className="sm:hidden">Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              title="Sair"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 sm:px-3"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden text-xs font-medium sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-6">
        {/* Filter chips / counters */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: '', label: 'Todos', count: summary?.total },
              { value: 'NEW', label: 'Novos', count: summary?.newCount },
              { value: 'ACTIVE', label: 'Ativos', count: summary?.activeCount },
              { value: 'INACTIVE', label: 'Inativos', count: summary?.inactiveCount },
            ] as const
          ).map((tab) => {
            const active = statusFilter === tab.value && !onlyHealthAlerts
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.value)
                  setOnlyHealthAlerts(false)
                  setPage(0)
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => {
              setOnlyHealthAlerts((prev) => !prev)
              setPage(0)
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition sm:text-sm ${
              onlyHealthAlerts
                ? 'border-amber-600 bg-amber-600 text-white'
                : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Alertas de saúde</span>
            {summary && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                  onlyHealthAlerts ? 'bg-white/20 text-white' : 'bg-amber-200/70 text-amber-900'
                }`}
              >
                {summary.withHealthAlertsCount}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar aluno por nome ou WhatsApp..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
          />
        </div>

        {/* List content */}
        <div className="mt-5">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="mt-2 text-sm">Carregando alunos...</p>
            </div>
          ) : data && data.content.length > 0 ? (
            <div className="space-y-3">
              {data.content.map((student) => (
                <Link
                  key={student.id}
                  to={`/alunos/${student.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-slate-400 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-bold text-slate-900">
                          {student.fullName}
                        </h2>
                        <StatusBadge status={student.status} />
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {student.age} anos • {formatPhone(student.phone)} • Cadastro em{' '}
                        {formatDateBR(student.createdAt)}
                      </p>

                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {student.primaryGoal && (
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {student.primaryGoal === 'OTHER' && student.primaryGoalOther
                              ? student.primaryGoalOther
                              : PRIMARY_GOAL_LABELS[student.primaryGoal]}
                          </span>
                        )}
                        {student.intendedWeeklyFrequency && (
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {student.intendedWeeklyFrequency}x/semana
                          </span>
                        )}
                        {student.hasHealthAlerts && (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {student.healthAlertsCount}{' '}
                            {student.healthAlertsCount === 1
                              ? 'alerta de saúde'
                              : 'alertas de saúde'}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
                  </div>
                </Link>
              ))}

              {data.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="text-xs text-slate-500">
                    Página {data.page + 1} de {data.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page + 1 >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <Users className="mx-auto h-8 w-8 text-slate-400" />
              <h3 className="mt-3 text-sm font-bold text-slate-800">Nenhum aluno encontrado</h3>
              <p className="mt-1 text-xs text-slate-500">
                Envie o link de auto-cadastro pelo WhatsApp para começar a receber as fichas dos
                alunos aqui.
              </p>
              <button
                type="button"
                onClick={handleCopyRegistrationLink}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar link de cadastro
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
