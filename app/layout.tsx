import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { accessCookieName, accessRole } from "../lib/site-access";
import { AccessProvider } from "./access-context";

export const metadata: Metadata = {
  title: "CityTeam Run Club",
  description: "Private attendance, profile, gear, and reporting app for CityTeam Run Club.",
  applicationName: "CityTeam Run Club",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "Run Club",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b2a42",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const role = accessRole((await cookies()).get(accessCookieName)?.value);
  return (
    <html lang="en">
      <body><AccessProvider viewOnly={role !== "admin"}>{children}</AccessProvider></body>
    </html>
  );
}
