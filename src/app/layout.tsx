import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CampMate',
  description: 'Turn a camping idea into a ready-to-go trip plan',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-stone-200 bg-white shadow-sm">
          <div className="mx-auto max-w-4xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">⛺</span>
            <a href="/" className="text-xl font-bold text-forest-800 hover:text-forest-700">
              CampMate
            </a>
            <span className="ml-auto text-xs text-stone-400">Camping Trip Planner</span>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
