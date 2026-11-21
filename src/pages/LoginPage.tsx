import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Loader2, Lock } from 'lucide-react'
import { ThemeToggle } from '../components/ThemeToggle'
import { ApiError } from '../services/api'
import { loginAdmin } from '../services/authService'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { from?: string } | null)?.from || '/alunos'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await loginAdmin(email.trim(), password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Não foi possível conectar ao servidor. Verifique se a API está online.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mk-alabaster px-4 py-10 transition-colors dark:bg-black">
      <div className="w-full max-w-md rounded-[4px] border border-mk-hairline bg-white p-7 shadow-xs sm:p-9 dark:border-white/12 dark:bg-mk-charcoal">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-mk-stone hover:text-black dark:text-mk-stone-dark dark:hover:text-mk-gold"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Início
          </Link>
          <ThemeToggle />
        </div>

        <div className="mt-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-mk-gold-text dark:text-mk-gold">
            Área Restrita
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[0.04em] text-black dark:text-mk-ivory">
            MK STUDIO
          </h1>
          <div className="mx-auto my-4 h-[1px] w-12 bg-mk-gold" />
          <p className="text-xs text-mk-stone dark:text-mk-stone-dark">
            Painel do Personal • Piracaia — SP
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-[4px] border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-mk-stone dark:text-mk-stone-dark"
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@mkstudio.local"
              className="w-full rounded-[4px] border border-mk-hairline bg-white px-3.5 py-2.5 text-sm text-black placeholder:text-mk-stone/50 focus:border-black focus:outline-none dark:border-white/15 dark:bg-mk-elevated dark:text-mk-ivory dark:focus:border-mk-gold"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-mk-stone dark:text-mk-stone-dark"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-[4px] border border-mk-hairline bg-white px-3.5 py-2.5 text-sm text-black placeholder:text-mk-stone/50 focus:border-black focus:outline-none dark:border-white/15 dark:bg-mk-elevated dark:text-mk-ivory dark:focus:border-mk-gold"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-[4px] bg-mk-gold px-4 py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-black transition hover:bg-mk-gold-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" />
                Entrar no Painel
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
