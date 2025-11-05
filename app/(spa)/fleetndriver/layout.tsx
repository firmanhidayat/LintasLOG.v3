import AuthGuard from "@/components/auth/AuthGuard";
import SectionShell from "@/components/layouts/SectionShell";
export default function FleetNDriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard nextPath="/fleetndriver">
      <SectionShell>{children}</SectionShell>
    </AuthGuard>
  );
}
