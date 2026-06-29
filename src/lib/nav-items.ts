import {
  Wallet,
  LayoutDashboard,
  PlusCircle,
  Settings,
  Brain,
  History,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/profiles", label: "Profiles", icon: Wallet },
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades/new", label: "New Trade", icon: PlusCircle },
  { href: "/history", label: "History", icon: History },
  { href: "/insights", label: "AI Insights", icon: Brain },
  { href: "/settings", label: "Settings", icon: Settings },
];
