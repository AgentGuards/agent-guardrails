"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  FlaskConical,
  Home,
  LayoutPanelLeft,
  LogOut,
  ScrollText,
  Settings,
  TriangleAlert,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/lib/stores/layout";
import { useSiwsAuthStore } from "@/lib/stores/siws-auth";
import { ShellNavbarActions } from "../shell-navbar-actions";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  nested?: boolean;
};

const navGroups: NavLink[][] = [
  [{ href: "/home", label: "Home", icon: Home, nested: false }],
  [
    { href: "/agents", label: "Agents", icon: Users },
    { href: "/activity", label: "Activity", icon: Activity },
    { href: "/incidents", label: "Incidents", icon: TriangleAlert },
  ],
  [{ href: "/audit", label: "Audit", icon: ScrollText, nested: false }],
  [{ href: "/playground", label: "Playground", icon: FlaskConical, nested: false }],
  [{ href: "/settings", label: "Settings", icon: Settings, nested: false }],
];

export function AppShell({
  title,
  subtitle,
  actions,
  brandedHeader = false,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** When true, shows wordmark logo + Guardrails with `title` as the page subtitle line. */
  brandedHeader?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const walletAdapter = useWallet();
  const { sidebarOpen, sidebarCollapsed, toggleSidebar, toggleSidebarCollapsed, setSidebarOpen } =
    useLayoutStore();

  if (!walletAdapter.connected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  const currentPath = pathname ?? "";
  const isLinkActive = (href: string, nested: boolean | undefined) => {
    if (href === "/agents?new=1") {
      return currentPath === "/agents";
    }
    return currentPath === href || (nested !== false && currentPath.startsWith(`${href}/`));
  };

  const collapsed = sidebarCollapsed;
  const sidebarWidth = collapsed ? "w-[60px]" : "w-60";

  const renderNavItem = (link: NavLink) => {
    const active = isLinkActive(link.href, link.nested);
    const Icon = link.icon;
    const iconSize = collapsed ? 18 : 16;
    return (
      <Link
        key={link.href}
        href={link.href}
        title={collapsed ? link.label : undefined}
        aria-label={link.label}
        aria-current={active ? "page" : undefined}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          "group relative flex items-center rounded-md text-sm transition-all duration-100",
          collapsed ? "mx-auto h-10 w-10 justify-center" : "gap-2.5 px-3 py-2",
          active
            ? "bg-zinc-800 text-white font-medium [&_svg]:text-teal-400"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 [&_svg]:text-zinc-500",
        )}
      >
        <Icon size={iconSize} className="shrink-0" strokeWidth={1.7} />
        {!collapsed ? <span className="truncate">{link.label}</span> : null}
      </Link>
    );
  };

  const onSignOut = () => {
    useSiwsAuthStore.getState().clearSignedIn();
    void walletAdapter.disconnect().catch(() => {
      /* wallet may already be disconnected */
    });
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full overflow-hidden bg-black text-foreground">
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-[100dvh] max-h-[100dvh] min-h-0 ${sidebarWidth} shrink-0 flex-col bg-black shadow-2xl transition-[width,transform] duration-300 ease-out md:relative md:inset-auto md:z-0 md:h-full md:max-h-none md:shadow-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0`}
      >
        <div className="shrink-0 px-2.5 pb-3 pt-[1.875rem] md:pt-[2.125rem]">
          <Link
            href="/"
            onClick={() => setSidebarOpen(false)}
            className={`relative flex items-center transition-colors hover:opacity-90 ${collapsed ? "h-10 w-10 mx-auto justify-center" : "gap-3 px-1.5 py-1.5"}`}
          >
            <Image
              src="/logo.png"
              alt="Guardrails logo"
              width={28}
              height={28}
              className={collapsed ? "h-7 w-7" : "h-7 w-7"}
              priority
            />
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.8125rem] font-semibold leading-snug tracking-[0.14em] text-zinc-100 md:text-[0.9375rem]">
                  Guardrails
                </div>
              </div>
            ) : null}
          </Link>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2.5">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              {idx > 0 ? (
                <div className="my-2 px-1.5">
                  <div className="h-px w-full bg-white/[0.12]" />
                </div>
              ) : null}
              <div className="flex flex-col gap-0.5">{group.map(renderNavItem)}</div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/[0.06] px-3 py-3">
          <div className={`${collapsed ? "mb-2 flex flex-col items-center gap-1.5" : "mb-2.5 flex flex-col gap-1.5"}`}>
            <button
              type="button"
              title={collapsed ? "Sign out" : undefined}
              aria-label="Sign out"
              onClick={onSignOut}
              className={`flex items-center rounded-md text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 ${collapsed ? "h-9 w-9 justify-center" : "gap-2.5 px-2.5 py-2 text-sm"
                }`}
            >
              <LogOut size={16} className="shrink-0" strokeWidth={1.8} />
              {!collapsed ? <span>Sign out</span> : null}
            </button>
          </div>
          {/* <div className="flex justify-center">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.7)]" />
          </div> */}
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-black">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#111114] text-foreground m-4 ml-0 border border-transparent rounded-xl">
          <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#111114] px-5 pb-4 pt-3.5 md:gap-4 md:px-7 md:pb-5 md:pt-4">
            <button
              type="button"
              aria-label="Toggle sidebar"
              className="-ml-2 hidden h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 md:inline-flex"
              onClick={toggleSidebarCollapsed}
            >
              <LayoutPanelLeft size={18} className="shrink-0" strokeWidth={1.7} />
            </button>
            <button
              type="button"
              aria-label="Open menu"
              className="-ml-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 md:hidden"
              onClick={toggleSidebar}
            >
              <LayoutPanelLeft size={18} className="shrink-0" strokeWidth={1.7} />
            </button>

            <div className="min-w-0 flex-1">
              {/* {brandedHeader ? (
                <h1 className="flex min-w-0 items-center gap-3 md:gap-3.5">
                  <Image
                    src="/logo.png"
                    alt=""
                    width={36}
                    height={36}
                    className="h-8 w-8 shrink-0 md:h-9 md:w-9"
                    aria-hidden
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[0.8125rem] font-normal leading-snug tracking-[0.14em] text-zinc-100 md:text-[0.9375rem]">
                      Guardrails
                    </span>
                    <span className="truncate text-[1rem] font-semibold leading-tight tracking-[-0.02em] text-zinc-50 md:text-[1.5rem]">
                      {title}
                    </span>
                  </span>
                </h1>
              ) : ( */}
              <h1 className="truncate text-[1rem] font-semibold leading-tight tracking-[-0.02em] text-zinc-50 md:text-[1.5rem]">
                {title}
              </h1>
              {/* )} */}
            </div>

            <div className="flex shrink-0 items-center md:ml-auto">
              <ShellNavbarActions />
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-8 [scrollbar-gutter:stable] md:px-7 md:pb-10">
            {subtitle || actions ? (
              <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
                {subtitle ? (
                  <p className="max-w-2xl text-[13px] leading-relaxed text-zinc-400">{subtitle}</p>
                ) : (
                  <span />
                )}
                <div className="flex shrink-0 items-center gap-2">{actions}</div>
              </header>
            ) : null}
            <PageErrorBoundary>
              <div className="animate-[fade-in-up_220ms_ease-out]">{children}</div>
            </PageErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}
