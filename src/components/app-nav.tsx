"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { navigateToAnchor } from "@/lib/dashboard-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { GlobalSearchPanel } from "@/components/global-search-panel";

export const NAV_LINKS = [
  { href: "/", label: "Дашборд" },
  { href: "/income", label: "Доходы" },
  { href: "/expenses", label: "Расходы" },
  { href: "/works", label: "Продакшн" },
  { href: "/purchases", label: "Закупки" },
  { href: "/vacations", label: "Отпуска" },
  { href: "/counterparties", label: "К/А" },
  { href: "/history", label: "История" },
  { href: "/access", label: "Доступ", ownerOnly: true },
] as const;

export function AppNav({
  email,
  canEdit,
  isOwner,
}: {
  email: string | null;
  canEdit: boolean;
  isOwner: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  const [active, setActive] = useState(0);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const navItems = useMemo(() => {
    const base = NAV_LINKS.filter((l) => !("ownerOnly" in l && l.ownerOnly) || isOwner);
    const q = navQuery.trim().toLowerCase();
    if (!q) return [...base];
    return base.filter(
      (l) => l.label.toLowerCase().includes(q) || l.href.toLowerCase().includes(q),
    );
  }, [isOwner, navQuery]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setOpen((v) => !v);
        setNavQuery("");
        setActive(0);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
      else if (!navQuery.trim() && e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(navItems.length - 1, 0)));
      } else if (!navQuery.trim() && e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && navItems[active]) {
        e.preventDefault();
        router.push(navItems[active].href);
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, navItems, active, router, navQuery]);

  useEffect(() => {
    setActive(0);
  }, [navQuery]);

  const visibleLinks = NAV_LINKS.filter((l) => !("ownerOnly" in l && l.ownerOnly) || isOwner);
  const roleLabel = isOwner ? "Владелец" : canEdit ? "Гость · редактирование" : "Гость · просмотр";

  function navigate(href: string) {
    setOpen(false);
    setNavQuery("");
    navigateToAnchor(href);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface)] shadow-[0_1px_0_rgba(0,0,0,0.03)]">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-2.5 px-3 py-3.5 sm:px-5">
        <nav className="nav-rail flex-1">
          {visibleLinks.map((link) => {
            const activeNav =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.label}
                className={`nav-chip ${activeNav ? "is-active" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="btn-ghost btn-inline hidden sm:inline-flex"
          onClick={() => setOpen(true)}
        >
          Поиск ⌘K
        </button>

        <div className="hidden text-right text-xs leading-tight md:block">
          {email ? <p className="font-medium text-[var(--ink)]">{email}</p> : null}
          <p className="text-[var(--muted)]">{roleLabel}</p>
        </div>

        <div className="shrink-0">
          <SignOutButton />
        </div>
      </div>

      {open ? (
        <div
          className="cmdk-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Глобальный поиск"
          onClick={() => setOpen(false)}
        >
          <div className="cmdk-panel cmdk-panel-wide" onClick={(e) => e.stopPropagation()} ref={searchWrapRef}>
            <input
              className="cmdk-input"
              autoFocus
              placeholder="Поиск по всем разделам и записям…"
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
            />

            {navQuery.trim() ? (
              <>
                {navItems.length > 0 ? (
                  <div className="cmdk-list">
                    <p className="px-3 py-1 text-xs font-medium text-[var(--muted)]">Разделы</p>
                    {navItems.map((item, i) => (
                      <button
                        key={item.href}
                        type="button"
                        className="cmdk-item"
                        data-active={i === active}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => {
                          router.push(item.href);
                          setOpen(false);
                        }}
                      >
                        <span>{item.label}</span>
                        <span className="cmdk-hint">{item.href}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <GlobalSearchPanel
                  query={navQuery}
                  open
                  onClose={() => setOpen(false)}
                  onNavigate={navigate}
                />
              </>
            ) : (
              <div className="cmdk-list">
                {navItems.map((item, i) => (
                  <button
                    key={item.href}
                    type="button"
                    className="cmdk-item"
                    data-active={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => {
                      router.push(item.href);
                      setOpen(false);
                    }}
                  >
                    <span>{item.label}</span>
                    <span className="cmdk-hint">{item.href}</span>
                  </button>
                ))}
              </div>
            )}

            <p className="border-t border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)]">
              ↑↓ разделы · Enter открыть · Esc закрыть · Ctrl/⌘K
            </p>
          </div>
        </div>
      ) : null}
    </header>
  );
}
