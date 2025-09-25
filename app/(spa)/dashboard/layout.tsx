"use client";

import SectionShell from "@/components/layouts/SectionShell";
import AuthGuard from "@/components/auth/AuthGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard nextPath="/dashboard">
      <SectionShell>{children}</SectionShell>
    </AuthGuard>
  );
}
