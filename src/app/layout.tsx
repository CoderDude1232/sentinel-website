import type { Metadata } from "next";
import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { GlobalNavbar } from "@/components/global-navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentinel",
  description: "ER:LC operations platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="surface-shell antialiased">
        <AmbientBackdrop />
        <GlobalNavbar />
        {children}
      </body>
    </html>
  );
}
