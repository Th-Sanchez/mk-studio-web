import { STATUS_LABELS, type StudentStatus } from '../types/anamnesis'

const STATUS_STYLES: Record<StudentStatus, string> = {
  NEW: 'border-mk-gold/60 bg-[#FFF8E7] text-mk-gold-text dark:border-mk-gold/50 dark:bg-mk-gold/15 dark:text-mk-gold',
  ACTIVE:
    'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-300',
  INACTIVE:
    'border-mk-hairline bg-[#F1EDE5] text-mk-stone dark:border-white/15 dark:bg-white/5 dark:text-mk-stone-dark',
}

interface StatusBadgeProps {
  status: StudentStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-[3px] border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
