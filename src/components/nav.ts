import {
  Bot, CalendarClock, CalendarDays, Car, FileText, FolderOpen, HeartPulse, Home, LayoutDashboard, Landmark,
  Package, Plane, Repeat, Settings, Sparkles, Users, Wallet, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: { area: string; items: NavItem[] }[] = [
  {
    area: "Panoramica",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/scadenziario", label: "Scadenziario", icon: CalendarClock },
      { href: "/agenda", label: "Agenda", icon: CalendarDays },
      { href: "/archivio", label: "File caricati", icon: FolderOpen },
    ],
  },
  {
    area: "Denaro",
    items: [
      { href: "/finanze", label: "Finanze", icon: Wallet },
      { href: "/abbonamenti", label: "Abbonamenti e contratti", icon: Repeat },
      { href: "/patrimonio", label: "Patrimonio e futuro", icon: Landmark },
      { href: "/il-mio-anno", label: "Il mio anno", icon: Sparkles },
    ],
  },
  {
    area: "Vita privata",
    items: [
      { href: "/documenti", label: "Documenti", icon: FileText },
      { href: "/casa", label: "Casa e immobili", icon: Home },
      { href: "/auto", label: "Auto e mobilità", icon: Car },
      { href: "/salute", label: "Salute", icon: HeartPulse },
      { href: "/beni", label: "Beni personali", icon: Package },
      { href: "/viaggi", label: "Viaggi", icon: Plane },
      { href: "/rubrica", label: "Rubrica", icon: Users },
    ],
  },
  {
    area: "Sistema",
    items: [
      { href: "/assistente", label: "Assistente AI", icon: Bot },
      { href: "/impostazioni", label: "Impostazioni", icon: Settings },
    ],
  },
];
