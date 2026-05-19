import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const APP_NAME = "Lookover";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://uselookover.com";
const APP_DESCRIPTION =
  "Talk through the inspection. Get the report drafted before you're back to your truck. AI-assisted reports for residential home inspectors — you approve every finding.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} — AI home inspection reports`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: `${APP_NAME} — AI home inspection reports`,
    description: APP_DESCRIPTION,
    url: APP_URL,
    // images: ["/og.png"], // add 1200x630 OG card once designed
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — AI home inspection reports`,
    description: APP_DESCRIPTION,
    // images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-slate-900">{children}</body>
    </html>
  );
}
