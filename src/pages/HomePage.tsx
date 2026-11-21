import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ClipboardList, Dumbbell, Lock } from 'lucide-react'
import { checkApiHealth } from '../services/api'

export function HomePage() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'up' | 'down'>('checking')

  useEffect(() => {
    checkApiHealth()
      .then(() => setApiStatus('up'))
      .catch(() => setApiStatus('down'))
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xs">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">MK STUDIO</h1>
            <p className="text-sm text-slate-500">Anamnese Online & Gestão de Alunos</p>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-slate-600">
          Bem-vindo ao portal do <strong>MK STUDIO</strong>. Se você é aluno, preencha sua ficha de
          anamnese online para agilizarmos sua avaliação. Se é o personal responsável, acesse o
          painel administrativo.
        </p>

        <div className="mt-6 space-y-3">
          <Link
            to="/cadastro"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <ClipboardList className="h-4 w-4" />
            Preencher Anamnese (Sou Aluno)
          </Link>

          <Link
            to="/login"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <Lock className="h-4 w-4" />
            Acessar Painel do Personal
          </Link>
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs font-medium text-slate-600">
          <Activity className="h-3.5 w-3.5 shrink-0" />
          <span>Servidor:</span>
          {apiStatus === 'checking' && <span className="text-amber-600">Verificando...</span>}
          {apiStatus === 'up' && <span className="text-emerald-700">Online</span>}
          {apiStatus === 'down' && (
            <span className="text-rose-600">Offline (inicie o mk-studio-api na porta 8080)</span>
          )}
        </div>
      </div>
    </div>
  )
}
