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
      {/* SectionShell sudah handle Sidebar/Header */}
      <SectionShell>{children}</SectionShell>
    </AuthGuard>
  );
}
