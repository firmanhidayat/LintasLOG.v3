import AuthGuard from "@/components/auth/AuthGuard";
import SectionShell from "@/components/layouts/SectionShell";
export default function ClaimsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // SectionShell sudah handle: Sidebar (desktop + mobile drawer), Header, dan state sidebarOpen.
  return (
    <AuthGuard nextPath="/claims">
      {/* SectionShell sudah handle Sidebar/Header */}
      <SectionShell>{children}</SectionShell>
    </AuthGuard>
  );
}
