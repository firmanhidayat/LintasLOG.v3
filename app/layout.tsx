// app/layout.tsx
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";

export const metadata = {
  title: "Lini Trans Logistik",
  description: "Dashboard Lini Trans Logistik",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="container-shell bg-white text-black">
        <SessionProvider>
          {/* Jangan render Header/Sidebar di root; biarkan di nested layout */}
          <main className="min-h-[60vh]">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
