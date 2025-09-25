import AuthGuard from "@/components/auth/AuthGuard";
import SectionShell from "@/components/layouts/SectionShell";
export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard nextPath="/orders">
      <SectionShell>{children}</SectionShell>
    </AuthGuard>
  );
}
