"use client";

import { useSession } from "next-auth/react";

function formatName(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
}

export default function UserGreeting() {
  const { data } = useSession();
  const name = data?.user?.name ?? data?.user?.email ?? "";

  if (!data) return null;

  return <div className="greeting">Hi {formatName(name)}!</div>;
}
