'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function AdminTabs() {
  const pathname = usePathname()
  
  const tabs = [
    { href: '/admin/reservas', label: 'Reservas' },
    { href: '/admin/bloqueos', label: 'Bloqueos' },
  ]

  return (
    <Tabs 
      value={tabs.find(tab => pathname.startsWith(tab.href))?.href || ''}
      className="w-full max-w-full overflow-x-auto overflow-y-hidden" // ← Asegura que nunca haya scroll vertical
    >
      <TabsList className="flex w-max min-w-full px-1 py-1 gap-1"> {/* Contenedor ajustable */}
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} legacyBehavior passHref>
            <TabsTrigger 
              value={tab.href} 
              asChild
              className="
                h-8 px-3 text-sm  // Tamaño base más compacto
                sm:h-9 sm:px-4 sm:text-base // Tamaño normal en desktop
                transition-all duration-200 // Suaviza los cambios
              "
            >
              <a className="whitespace-nowrap">
                {tab.label}
              </a>
            </TabsTrigger>
          </Link>
        ))}
      </TabsList>
    </Tabs>
  )
}