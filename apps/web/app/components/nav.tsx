"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/insights", label: "Insights" },
  { href: "/trends", label: "Trends" }
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    links.forEach((link) => router.prefetch(link.href));
  }, [router]);

  return (
    <nav className="nav" aria-label="Primary">
      {links.map((link) => {
        const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link key={link.href} className={`nav-link${isActive ? " is-active" : ""}`} href={link.href}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
