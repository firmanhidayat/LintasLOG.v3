// import "react-tailwindcss-datepicker/dist/index.css";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";

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
        <AuthProvider>
          <main className="min-h-[60vh]">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
