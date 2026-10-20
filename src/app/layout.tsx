import "~/styles/globals.css";

import { type Metadata, type Viewport } from "next";

export const metadata: Metadata = {
  title: "Lockbox",
  robots: { index: false, follow: false },
  other: { "darkreader-lock": "true" },
};

export const viewport: Viewport = { themeColor: "#1d2021", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
