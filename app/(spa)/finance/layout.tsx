import SectionShell from "@/components/layouts/SectionShell";
export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // SectionShell sudah handle: Sidebar (desktop + mobile drawer), Header, dan state sidebarOpen.
  return <SectionShell>{children}</SectionShell>;
}
