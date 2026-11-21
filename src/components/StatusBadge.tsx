import { STATUS_LABELS, type StudentStatus } from '../types/anamnesis'

const STATUS_STYLES: Record<StudentStatus, string> = {
  NEW: 'bg-sky-100 text-sky-800 border-sky-200',
  ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  INACTIVE: 'bg-slate-200 text-slate-700 border-slate-300',
}

interface StatusBadgeProps {
  status: StudentStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
