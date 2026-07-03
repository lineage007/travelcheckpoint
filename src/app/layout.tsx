import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // metadataBase resolves relative OG/Twitter image paths. Falls back to localhost for local dev.
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: "TravelCheckpoint",
  description: "Flight search — cash fares, award points, hidden city, empty legs",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TravelCheckpoint",
  },
  openGraph: {
    title: "TravelCheckpoint",
    description: "Search cash fares, award seats, hidden city routes and empty legs in one place.",
    type: "website",
    siteName: "TravelCheckpoint",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "TravelCheckpoint" }],
  },
  twitter: {
    card: "summary",
    title: "TravelCheckpoint",
    description: "Search cash fares, award seats, hidden city routes and empty legs in one place.",
    images: ["/icon-512.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0A1628",
  width: "device-width",
  initialScale: 1,
  // M3: Allow pinch-zoom for accessibility (WCAG 2.1 SC 1.4.4 — Resize Text).
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased" style={{ fontFamily: "var(--font-body)", background: '#06060a', color: '#ffffff' }}>
        {children}
      </body>
    </html>
  );
}
