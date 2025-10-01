import AuthGuard from "@/components/auth/AuthGuard";
import SectionShell from "@/components/layouts/SectionShell";
export default function DownpaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard nextPath="/downpayment">
      <SectionShell>{children}</SectionShell>
    </AuthGuard>
  );
}
