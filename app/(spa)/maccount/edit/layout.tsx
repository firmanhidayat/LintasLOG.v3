import SectionShell from "@/components/layouts/SectionShell";
export default function ManagementAccountEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // SectionShell sudah handle: Sidebar (desktop + mobile drawer), Header, dan state sidebarOpen.
  return <SectionShell>{children}</SectionShell>;
}
