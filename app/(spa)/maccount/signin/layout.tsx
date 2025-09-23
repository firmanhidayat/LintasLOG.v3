import SectionShell from "@/components/layouts/SectionShell";
export default function ManagementAccountSignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // SectionShell sudah handle: Sidebar (desktop + mobile drawer), Header, dan state sidebarOpen.
  return (
    <SectionShell
      contentPaddingClassName="p-0"
      showHeader={false}
      showSidebar={false}
    >
      {children}
    </SectionShell>
  );
}
