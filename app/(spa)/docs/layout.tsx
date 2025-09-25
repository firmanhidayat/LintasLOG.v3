import AuthGuard from "@/components/auth/AuthGuard";
import SectionShell from "@/components/layouts/SectionShell";
export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard nextPath="/docs">
      {/* SectionShell sudah handle Sidebar/Header */}
      <SectionShell>{children}</SectionShell>
    </AuthGuard>
  );
}
