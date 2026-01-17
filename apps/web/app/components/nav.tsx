"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/trends", label: "Trends" },
  { href: "/insights", label: "Insights" },
  { href: "/data-quality", label: "Data quality" },
  { href: "/metrics", label: "Raw metrics" }
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
