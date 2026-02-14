import type { Metadata } from "next";
import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { GlobalNavbar } from "@/components/global-navbar";
import "./globals.css";

function resolveAppUrl(): string {
  const fromPublic = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromPublic) {
    return fromPublic;
  }
  const fromVercel = process.env.VERCEL_URL?.trim();
  if (fromVercel) {
    return fromVercel.startsWith("http") ? fromVercel : `https://${fromVercel}`;
  }
  return "http://localhost:3000";
}

const appUrl = resolveAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Sentinel",
    template: "%s | Sentinel",
  },
  description: "Real-time ER:LC operations platform for moderation, sessions, and staff oversight.",
  openGraph: {
    type: "website",
    url: "/",
    title: "Sentinel",
    description: "Real-time ER:LC operations platform for moderation, sessions, and staff oversight.",
    siteName: "Sentinel",
    images: [
      {
        url: "/cinematic1.png",
        width: 1200,
        height: 630,
        alt: "Sentinel ER:LC command platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sentinel",
    description: "Real-time ER:LC operations platform for moderation, sessions, and staff oversight.",
    images: ["/cinematic1.png"],
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
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
