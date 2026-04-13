import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GBC Analytics Dashboard",
  description: "Orders analytics dashboard powered by RetailCRM + Supabase",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
