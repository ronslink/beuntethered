"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileDock({ role }: { role?: string }) {
  const pathname = usePathname();
  const isClient = role === "CLIENT";

  const linkClass = (path: string) => {
    const isActive =
      pathname === path ||
      (path === "/dashboard" && pathname === "/") ||
      (path !== "/dashboard" && pathname.startsWith(path));

    return `flex flex-col items-center justify-center gap-1 transition-colors ${
      isActive ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
    }`;
  };

  const fill = (path: string) => {
    const isActive =
      pathname === path ||
      (path === "/dashboard" && pathname === "/") ||
      (path !== "/dashboard" && pathname.startsWith(path));
    return isActive ? "'FILL' 1" : "'FILL' 0";
  };

  return (
    <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-container-high/90 backdrop-blur-2xl px-6 py-4 rounded-full border border-outline-variant/30 shadow-2xl flex items-center justify-between gap-8 z-50 min-w-[280px]">
      <Link href="/dashboard" className={linkClass("/dashboard")}>
        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: fill("/dashboard") }}>
          grid_view
        </span>
      </Link>

      {isClient ? (
        <>
          <Link href="/projects" className={linkClass("/projects")}>
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: fill("/projects") }}>
              folder_open
            </span>
          </Link>
          <Link href="/talent" className={linkClass("/talent")}>
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: fill("/talent") }}>
              person_search
            </span>
          </Link>
        </>
      ) : (
        <>
          <Link href="/command-center" className={linkClass("/command-center")}>
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: fill("/command-center") }}>
              rocket_launch
            </span>
          </Link>
          <Link href="/marketplace" className={linkClass("/marketplace")}>
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: fill("/marketplace") }}>
              storefront
            </span>
          </Link>
        </>
      )}

      <Link href="/wallet" className={linkClass("/wallet")}>
        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: fill("/wallet") }}>
          account_balance_wallet
        </span>
      </Link>
    </div>
  );
}
