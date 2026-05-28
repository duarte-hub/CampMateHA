'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="text-xs font-medium text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-700 rounded-lg px-3 py-1.5 transition-colors"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}
