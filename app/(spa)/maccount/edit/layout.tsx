import AuthGuard from "@/components/auth/AuthGuard";
import SectionShell from "@/components/layouts/SectionShell";
export default function ManagementAccountEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard nextPath="/maccount/edit">
      {/* SectionShell sudah handle Sidebar/Header */}
      <SectionShell>{children}</SectionShell>
    </AuthGuard>
  );
}
