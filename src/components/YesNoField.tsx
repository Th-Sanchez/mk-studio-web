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
    <div className="rounded-[4px] border border-mk-hairline bg-white p-3.5 transition dark:border-white/12 dark:bg-mk-elevated">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-black dark:text-mk-ivory">{label}</span>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-36">
          <button
            type="button"
            onClick={() => onChange({ answer: true, details: value.details })}
            className={`min-h-[42px] rounded-[4px] border text-xs font-bold uppercase tracking-wider transition ${
              value.answer
                ? 'border-mk-gold bg-mk-gold text-black shadow-2xs'
                : 'border-mk-hairline bg-white text-mk-stone hover:border-black hover:text-black dark:border-white/15 dark:bg-mk-charcoal dark:text-mk-stone-dark dark:hover:border-mk-gold dark:hover:text-mk-ivory'
            }`}
          >
            Sim
          </button>
          <button
            type="button"
            onClick={() => onChange({ answer: false, details: null })}
            className={`min-h-[42px] rounded-[4px] border text-xs font-bold uppercase tracking-wider transition ${
              !value.answer
                ? 'border-black bg-black text-white dark:border-mk-ivory dark:bg-mk-ivory dark:text-black'
                : 'border-mk-hairline bg-white text-mk-stone hover:border-black hover:text-black dark:border-white/15 dark:bg-mk-charcoal dark:text-mk-stone-dark dark:hover:border-mk-gold dark:hover:text-mk-ivory'
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
            className="w-full rounded-[4px] border border-mk-gold/60 bg-[#FFFDF7] px-3 py-2 text-sm text-black placeholder:text-mk-stone/60 focus:border-mk-gold focus:bg-white focus:outline-none dark:border-mk-gold/50 dark:bg-mk-charcoal dark:text-mk-ivory dark:placeholder:text-mk-stone-dark/60"
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
    <div className="flex flex-col gap-3 rounded-[4px] border border-mk-hairline bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-white/12 dark:bg-mk-elevated">
      <span className="text-sm font-medium text-black dark:text-mk-ivory">{label}</span>
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-36">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`min-h-[42px] rounded-[4px] border text-xs font-bold uppercase tracking-wider transition ${
            value
              ? highlightYes
                ? 'border-mk-gold bg-mk-gold text-black shadow-2xs'
                : 'border-black bg-black text-white dark:border-mk-gold dark:bg-mk-gold dark:text-black'
              : 'border-mk-hairline bg-white text-mk-stone hover:border-black hover:text-black dark:border-white/15 dark:bg-mk-charcoal dark:text-mk-stone-dark dark:hover:border-mk-gold dark:hover:text-mk-ivory'
          }`}
        >
          Sim
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`min-h-[42px] rounded-[4px] border text-xs font-bold uppercase tracking-wider transition ${
            !value
              ? 'border-black bg-black text-white dark:border-mk-ivory dark:bg-mk-ivory dark:text-black'
              : 'border-mk-hairline bg-white text-mk-stone hover:border-black hover:text-black dark:border-white/15 dark:bg-mk-charcoal dark:text-mk-stone-dark dark:hover:border-mk-gold dark:hover:text-mk-ivory'
          }`}
        >
          Não
        </button>
      </div>
    </div>
  )
}
