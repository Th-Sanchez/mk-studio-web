import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  Loader2,
  LogOut,
  MessageCircle,
  Search,
  Users,
} from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge'
import { ThemeToggle } from '../components/ThemeToggle'
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
import { buildWhatsAppUrl, formatDateBR, formatPhone } from '../utils/formatters'

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
    <div className="min-h-screen bg-mk-alabaster pb-14 transition-colors dark:bg-black">
      <header className="sticky top-0 z-20 border-b border-mk-hairline bg-white/95 backdrop-blur dark:border-white/12 dark:bg-black/95">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3.5">
          <div>
            <h1 className="font-serif text-lg font-semibold tracking-[0.06em] text-black sm:text-xl dark:text-mk-ivory">
              MK STUDIO
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mk-gold-text dark:text-mk-gold">
              {adminUser?.name || 'Painel do Personal'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyRegistrationLink}
              className="inline-flex h-9 items-center gap-1.5 rounded-[4px] bg-mk-gold px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-black transition hover:bg-mk-gold-hover sm:px-3.5"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Copiar link</span>
                  <span className="sm:hidden">Link</span>
                </>
              )}
            </button>

            <ThemeToggle />

            <button
              type="button"
              onClick={handleLogout}
              title="Sair"
              aria-label="Sair"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[4px] border border-mk-hairline bg-white text-mk-stone hover:border-black hover:text-black dark:border-white/15 dark:bg-mk-elevated dark:text-mk-stone-dark dark:hover:border-mk-gold dark:hover:text-mk-ivory"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-6">
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-mk-gold-text dark:text-mk-gold">
            Painel do Personal • Piracaia — SP
          </p>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-black sm:text-3xl dark:text-mk-ivory">
            Alunos Cadastrados
          </h2>
        </div>

        {/* Filter chips */}
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
                className={`inline-flex items-center gap-1.5 rounded-[4px] border px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? 'border-black bg-black text-white dark:border-mk-gold dark:bg-mk-gold dark:text-black'
                    : 'border-mk-hairline bg-white text-black hover:border-black dark:border-white/15 dark:bg-mk-charcoal dark:text-mk-ivory dark:hover:border-mk-gold'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`rounded-[3px] px-1.5 py-0.5 text-[10px] font-bold ${
                      active
                        ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                        : 'bg-mk-alabaster text-mk-stone dark:bg-white/10 dark:text-mk-stone-dark'
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
            className={`inline-flex items-center gap-1.5 rounded-[4px] border px-3 py-2 text-xs font-semibold transition ${
              onlyHealthAlerts
                ? 'border-amber-600 bg-amber-600 text-white'
                : 'border-amber-300 bg-[#FFFBEB] text-amber-900 hover:border-amber-500 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Alertas de saúde</span>
            {summary && (
              <span
                className={`rounded-[3px] px-1.5 py-0.5 text-[10px] font-bold ${
                  onlyHealthAlerts
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-200/80 text-amber-950 dark:bg-amber-900/60 dark:text-amber-200'
                }`}
              >
                {summary.withHealthAlertsCount}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-mk-stone dark:text-mk-stone-dark" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar aluno por nome ou WhatsApp..."
            className="w-full rounded-[4px] border border-mk-hairline bg-white py-2.5 pl-10 pr-4 text-sm text-black placeholder:text-mk-stone/60 focus:border-black focus:outline-none dark:border-white/15 dark:bg-mk-charcoal dark:text-mk-ivory dark:placeholder:text-mk-stone-dark/60 dark:focus:border-mk-gold"
          />
        </div>

        {/* List content */}
        <div className="mt-5">
          {error && (
            <div className="rounded-[4px] border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-mk-stone dark:text-mk-stone-dark">
              <Loader2 className="h-6 w-6 animate-spin text-mk-gold" />
              <p className="mt-2 text-sm">Carregando alunos...</p>
            </div>
          ) : data && data.content.length > 0 ? (
            <div className="space-y-3.5">
              {data.content.map((student) => {
                const alerts = student.healthAlerts || []
                const visibleAlerts = alerts.slice(0, 3)
                const remainingAlerts = alerts.length - visibleAlerts.length

                return (
                  <article
                    key={student.id}
                    className="rounded-[4px] border border-mk-hairline bg-white p-4 shadow-2xs transition hover:border-black/40 sm:p-5 dark:border-white/12 dark:bg-mk-charcoal dark:hover:border-mk-gold/50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <Link
                            to={`/alunos/${student.id}`}
                            className="font-serif text-xl font-semibold text-black hover:text-mk-gold-text dark:text-mk-ivory dark:hover:text-mk-gold"
                          >
                            {student.fullName}
                          </Link>
                          <StatusBadge status={student.status} />
                        </div>

                        <p className="mt-1 text-xs text-mk-stone dark:text-mk-stone-dark">
                          {student.age} anos • {formatPhone(student.phone)} • Cadastro em{' '}
                          {formatDateBR(student.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {student.primaryGoal && (
                        <span className="rounded-[3px] bg-mk-alabaster px-2.5 py-1 text-xs font-medium text-black dark:bg-white/8 dark:text-mk-ivory">
                          {student.primaryGoal === 'OTHER' && student.primaryGoalOther
                            ? student.primaryGoalOther
                            : PRIMARY_GOAL_LABELS[student.primaryGoal]}
                        </span>
                      )}
                      {student.intendedWeeklyFrequency && (
                        <span className="rounded-[3px] bg-mk-alabaster px-2.5 py-1 text-xs font-medium text-black dark:bg-white/8 dark:text-mk-ivory">
                          {student.intendedWeeklyFrequency}x/semana
                        </span>
                      )}
                    </div>

                    {student.hasHealthAlerts && (
                      <div className="mt-3.5 rounded-[3px] border border-amber-300/80 border-l-2 border-l-mk-gold bg-[#FFFBEB] p-3 dark:border-amber-700/50 dark:border-l-mk-gold dark:bg-amber-950/30">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-900 dark:text-amber-300">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          Alertas de Saúde ({student.healthAlertsCount})
                        </p>
                        {visibleAlerts.length > 0 && (
                          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-amber-950 dark:text-amber-100/90">
                            {visibleAlerts.map((alert, idx) => (
                              <li key={idx}>{alert}</li>
                            ))}
                          </ul>
                        )}
                        {remainingAlerts > 0 && (
                          <p className="mt-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                            + {remainingAlerts}{' '}
                            {remainingAlerts === 1 ? 'alerta na ficha' : 'alertas na ficha'}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-mk-hairline pt-3.5 dark:border-white/10">
                      <a
                        href={buildWhatsAppUrl(
                          student.phone,
                          `Olá ${student.fullName.split(' ')[0]}, tudo bem? Aqui é do MK STUDIO!`,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-[4px] border border-emerald-600/40 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-600 hover:text-white dark:border-emerald-600/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-600 dark:hover:text-white"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>

                      <Link
                        to={`/alunos/${student.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-black hover:text-mk-gold-text dark:text-mk-gold dark:hover:text-mk-ivory"
                      >
                        Ver ficha completa
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </article>
                )
              })}

              {data.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="rounded-[4px] border border-mk-hairline bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-black disabled:opacity-40 dark:border-white/15 dark:bg-mk-charcoal dark:text-mk-ivory"
                  >
                    Anterior
                  </button>
                  <span className="text-xs text-mk-stone dark:text-mk-stone-dark">
                    Página {data.page + 1} de {data.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page + 1 >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-[4px] border border-mk-hairline bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-black disabled:opacity-40 dark:border-white/15 dark:bg-mk-charcoal dark:text-mk-ivory"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[4px] border border-dashed border-mk-hairline bg-white p-10 text-center dark:border-white/15 dark:bg-mk-charcoal">
              <Users className="mx-auto h-7 w-7 text-mk-stone dark:text-mk-stone-dark" />
              <h3 className="mt-3 font-serif text-lg font-semibold text-black dark:text-mk-ivory">
                Nenhum aluno encontrado
              </h3>
              <p className="mt-1 text-xs text-mk-stone dark:text-mk-stone-dark">
                Envie o link de auto-cadastro pelo WhatsApp para começar a receber as fichas dos
                alunos aqui.
              </p>
              <button
                type="button"
                onClick={handleCopyRegistrationLink}
                className="mt-5 inline-flex items-center gap-1.5 rounded-[4px] bg-mk-gold px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-black hover:bg-mk-gold-hover"
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar link de cadastro
              </button>
            </div>
          )}
        </div>

        <p className="mt-10 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-mk-stone/80 dark:text-mk-stone-dark/70">
          MK STUDIO • Piracaia — SP
        </p>
      </main>
    </div>
  )
}
