import SectionShell from "@/components/layouts/SectionShell";
export default function ManagementAccountResetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
