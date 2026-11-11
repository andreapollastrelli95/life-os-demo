"use client";

import { ChevronsLeft, ChevronsRight, Lock, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { isDemo } from "@/lib/types";
import { useData } from "./DataProvider";
import { GlobalSearch } from "./GlobalSearch";
import { NAV } from "./nav";
import { Notifications } from "./Notifications";

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Moduli" className="flex-1 overflow-y-auto px-2 pb-4">
      {NAV.map(({ area, items }) => (
        <div key={area} className="mt-4">
          {!collapsed && <p className="px-2 pb-1 text-xs tracking-wide text-white/50 uppercase">{area}</p>}
          <ul className="space-y-0.5">
            {items.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link href={href} onClick={onNavigate} title={collapsed ? label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      active ? "bg-night-700 text-white" : "text-white/75 hover:bg-night-800 hover:text-white"
                    } ${collapsed ? "justify-center" : ""}`}>
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {collapsed ? <span className="sr-only">{label}</span> : label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { db, online, lock } = useData();
  const demo = isDemo(db);
  const nome = db.meta.profilo?.nome ?? "Profilo demo";
  const iniziali = nome.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex h-dvh flex-col">
      {demo ? (
        <div role="status" className="shrink-0 bg-warn px-4 py-1.5 text-center text-xs font-semibold tracking-wide text-white sm:text-sm">
          MODALITÀ DEMO – dati fittizi
        </div>
      ) : (
        <div role="status" className="shrink-0 bg-night-950 px-4 py-1.5 text-center text-xs font-medium text-white/85 sm:text-sm">
          Dati personali · protetti da PIN · salvati nel tuo Google Drive
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className={`hidden shrink-0 flex-col bg-night-900 transition-[width] md:flex ${collapsed ? "w-16" : "w-64"}`}>
          <div className={`flex h-14 items-center px-3 ${collapsed ? "justify-center" : "justify-between"}`}>
            {!collapsed && <span className="text-lg font-bold tracking-tight text-white">LIFE OS</span>}
            <button type="button" onClick={() => setCollapsed((c) => !c)}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-white/70 hover:bg-night-800 hover:text-white"
              aria-label={collapsed ? "Espandi menu" : "Comprimi menu"} aria-expanded={!collapsed}>
              {collapsed ? <ChevronsRight className="size-4" aria-hidden /> : <ChevronsLeft className="size-4" aria-hidden />}
            </button>
          </div>
          <SidebarContent collapsed={collapsed} />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button type="button" aria-label="Chiudi menu" className="absolute inset-0 bg-night-950/55" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-night-900">
              <div className="flex h-14 items-center justify-between px-3">
                <span className="text-lg font-bold tracking-tight text-white">LIFE OS</span>
                <button type="button" onClick={() => setMobileOpen(false)} aria-label="Chiudi menu"
                  className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-white/70 hover:bg-night-800">
                  <X className="size-4" aria-hidden />
                </button>
              </div>
              <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white px-3 sm:px-4">
            <button type="button" className="btn-icon md:hidden" onClick={() => setMobileOpen(true)} aria-label="Apri menu">
              <Menu className="size-5" aria-hidden />
            </button>
            <GlobalSearch />
            <Notifications />
            {online && (
              <button type="button" className="btn-icon" onClick={lock} title="Blocca: alla prossima apertura serve il PIN" aria-label="Blocca LIFE OS">
                <Lock className="size-4" aria-hidden />
              </button>
            )}
            <div className="flex shrink-0 items-center gap-2 pl-1">
              <span className="flex size-8 items-center justify-center rounded-full bg-night-800 text-xs font-semibold text-white" aria-hidden>{iniziali}</span>
              <span className="hidden text-sm leading-tight lg:block">
                <span className="block font-medium">{nome}</span>
                <span className="block text-xs text-muted">{online ? "Accesso con PIN" : "Demo nel browser"}</span>
              </span>
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
