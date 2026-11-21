import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const THEME_KEY = 'mk_studio_theme'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    try {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light')
    } catch {
      // Ignore storage errors
    }
  }, [isDark])

  return (
    <button
      type="button"
      onClick={() => setIsDark((prev) => !prev)}
      title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[4px] border border-mk-hairline bg-white text-black transition hover:border-mk-gold hover:text-mk-gold-text dark:border-white/15 dark:bg-mk-elevated dark:text-mk-ivory dark:hover:border-mk-gold dark:hover:text-mk-gold"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
