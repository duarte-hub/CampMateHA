import type { Metadata } from 'next'
import './globals.css'
import ThemeToggle from './ThemeToggle'

export const metadata: Metadata = {
  title: 'CampMate',
  description: 'Turn a camping idea into a ready-to-go trip plan',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()` }} />
      </head>
      <body className="min-h-screen bg-stone-50 dark:bg-stone-950 transition-colors duration-200">
        <header className="border-b border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">⛺</span>
            <a href="/" className="text-xl font-bold text-forest-800 hover:text-forest-700 dark:text-forest-400 dark:hover:text-forest-300">
              CampMate
            </a>
            <span className="hidden sm:inline ml-auto text-xs text-stone-400 dark:text-stone-500">Camping Trip Planner</span>
            <div className="ml-auto sm:ml-3 flex items-center gap-2">
              <a href="/calendar" className="text-xs font-medium text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 dark:text-stone-400 dark:hover:text-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 rounded-lg px-3 py-1.5 transition-colors">
                📅 Calendar
              </a>
              <a href="/settings" className="text-xs font-medium text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 dark:text-stone-400 dark:hover:text-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 rounded-lg px-3 py-1.5 transition-colors">
                ⚙️ Settings
              </a>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
