import AuthGuard from "@/components/auth/AuthGuard";
import SectionShell from "@/components/layouts/SectionShell";
export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard nextPath="/finance">
      {/* SectionShell sudah handle Sidebar/Header */}
      <SectionShell>{children}</SectionShell>
    </AuthGuard>
  );
}
