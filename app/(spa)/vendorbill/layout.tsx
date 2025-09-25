import AuthGuard from "@/components/auth/AuthGuard";
import SectionShell from "@/components/layouts/SectionShell";
export default function VendorBillLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard nextPath="/vendorbill">
      <SectionShell>{children}</SectionShell>
    </AuthGuard>
  );
}
