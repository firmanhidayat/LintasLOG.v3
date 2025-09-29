import AuthGuard from "@/components/auth/AuthGuard";
import SectionShell from "@/components/layouts/SectionShell";
export default function ClaimsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard nextPath="/claims">
      <SectionShell>{children}</SectionShell>
    </AuthGuard>
  );
}
