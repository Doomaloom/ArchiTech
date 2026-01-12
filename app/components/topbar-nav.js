"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Tech Stack", href: "/" },
  { label: "Page 2", href: "/page2" },
  { label: "Page 3", href: "/page3" },
  { label: "Page 4", href: "/page4" },
];

const isActiveRoute = (pathname, href) => {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href;
};

export default function TopbarNav() {
  const pathname = usePathname();

  return (
    <nav className="topbar-nav" aria-label="Primary">
      {navItems.map((item) => {
        const isActive = isActiveRoute(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={isActive ? "nav-pill is-active" : "nav-link"}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
