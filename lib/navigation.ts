import {
  HistoryIcon,
  LayoutDashboardIcon,
  Link2Icon,
  PenSquareIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  title: string;
};

export const dashboardNavItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboardIcon,
    title: "Dashboard",
  },
  {
    href: "/create",
    label: "Create Post",
    icon: PenSquareIcon,
    title: "Create Post",
  },
  {
    href: "/history",
    label: "History",
    icon: HistoryIcon,
    title: "Post History",
  },
  {
    href: "/accounts",
    label: "Accounts",
    icon: Link2Icon,
    title: "Connected Accounts",
  },
];

export function getPageTitle(pathname: string): string {
  const item = dashboardNavItems.find(
    (nav) => nav.href === pathname || (nav.href !== "/" && pathname.startsWith(nav.href)),
  );

  return item?.title ?? "Dashboard";
}
