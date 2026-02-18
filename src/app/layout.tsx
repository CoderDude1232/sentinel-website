import type { Metadata, Viewport } from "next";
import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { DevtoolsGuard } from "@/components/devtools-guard";
import { GlobalNavbar } from "@/components/global-navbar";
import packageJson from "../../package.json";
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
  if (process.env.NODE_ENV === "production") {
    return "https://sentinelerlc.xyz";
  }
  return "http://localhost:3000";
}

const appUrl = resolveAppUrl();
const appVersion = `v${packageJson.version}`;

export const viewport: Viewport = {
  themeColor: "#b11226",
};

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
        url: "/embed.png",
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
    images: ["/embed.png"],
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
        <DevtoolsGuard />
        <AmbientBackdrop />
        <GlobalNavbar />
        {children}
        <div
          aria-label={`Sentinel version ${appVersion}`}
          className="pointer-events-none fixed bottom-2 left-3 z-10 text-[10px] tracking-[0.1em] text-[rgba(255,255,255,0.38)] sm:bottom-3 sm:left-4 sm:text-xs"
        >
          {appVersion}
        </div>
      </body>
    </html>
  );
}
