import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Lock } from 'lucide-react'
import { ThemeToggle } from '../components/ThemeToggle'
import { checkApiHealth } from '../services/api'

export function HomePage() {
  useEffect(() => {
    checkApiHealth().catch(() => undefined)
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-mk-alabaster px-4 py-10 transition-colors dark:bg-black">
      <div className="relative w-full max-w-md rounded-[4px] border border-mk-hairline bg-white p-7 shadow-xs sm:p-10 dark:border-white/12 dark:bg-mk-charcoal">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        <div className="pt-2 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-mk-gold-text dark:text-mk-gold">
            Personal Training Exclusivo
          </p>

          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[0.04em] text-black sm:text-5xl dark:text-mk-ivory">
            MK STUDIO
          </h1>

          <div className="mx-auto my-5 h-[1.5px] w-14 bg-mk-gold" />

          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mk-stone dark:text-mk-stone-dark">
            Anamnese Online &amp; Gestão de Alunos
          </p>
        </div>

        <p className="mt-6 text-center text-sm leading-relaxed text-mk-stone dark:text-mk-stone-dark">
          Preencha sua ficha de anamnese online para agilizarmos sua avaliação personalizada e
          garantirmos um atendimento seguro e sob medida.
        </p>

        <div className="mt-8 space-y-3">
          <Link
            to="/cadastro"
            className="flex w-full items-center justify-center gap-2 rounded-[4px] bg-mk-gold px-5 py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-black transition hover:bg-mk-gold-hover"
          >
            <span>Preencher Anamnese (Sou Aluno)</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            to="/login"
            className="flex w-full items-center justify-center gap-2 rounded-[4px] border border-black bg-white px-5 py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-black transition hover:bg-black hover:text-white dark:border-mk-gold/60 dark:bg-transparent dark:text-mk-ivory dark:hover:bg-mk-gold/10"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Acessar Painel do Personal</span>
          </Link>
        </div>

        <div className="mt-8 border-t border-mk-hairline pt-5 dark:border-white/10">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-mk-stone/80 dark:text-mk-stone-dark/70">
            MK STUDIO • Piracaia — SP
          </p>
        </div>
      </div>
    </div>
  )
}
