import type { YesNoDetail } from '../types/anamnesis'

interface YesNoDetailFieldProps {
  label: string
  value: YesNoDetail
  onChange: (next: YesNoDetail) => void
  detailPlaceholder?: string
}

export function YesNoDetailField({
  label,
  value,
  onChange,
  detailPlaceholder = 'Se desejar, descreva rapidamente (opcional)',
}: YesNoDetailFieldProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-slate-800">{label}</span>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-36">
          <button
            type="button"
            onClick={() => onChange({ answer: true, details: value.details })}
            className={`min-h-[40px] rounded-lg border text-sm font-semibold transition ${
              value.answer
                ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Sim
          </button>
          <button
            type="button"
            onClick={() => onChange({ answer: false, details: null })}
            className={`min-h-[40px] rounded-lg border text-sm font-semibold transition ${
              !value.answer
                ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Não
          </button>
        </div>
      </div>

      {value.answer && (
        <div className="mt-3">
          <input
            type="text"
            value={value.details ?? ''}
            onChange={(e) => onChange({ answer: true, details: e.target.value || null })}
            placeholder={detailPlaceholder}
            maxLength={500}
            className="w-full rounded-lg border border-amber-300 bg-amber-50/40 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none"
          />
        </div>
      )}
    </div>
  )
}

interface YesNoBooleanFieldProps {
  label: string
  value: boolean
  onChange: (next: boolean) => void
  highlightYes?: boolean
}

export function YesNoBooleanField({
  label,
  value,
  onChange,
  highlightYes = false,
}: YesNoBooleanFieldProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-36">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`min-h-[40px] rounded-lg border text-sm font-semibold transition ${
            value
              ? highlightYes
                ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                : 'border-slate-900 bg-slate-900 text-white shadow-xs'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Sim
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`min-h-[40px] rounded-lg border text-sm font-semibold transition ${
            !value
              ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Não
        </button>
      </div>
    </div>
  )
}
