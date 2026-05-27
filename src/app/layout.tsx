import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "./components/layout/Navbar";
import Providers from "./components/Providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prozorro Radar — Tender Risk Signals",
  description: "Procurement risk signal triage tool for Prozorro public tenders",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>👀</text></svg>",
  },
};

const authDisabled = process.env.AUTH_DISABLED === "true";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className="dark">
      <body className={`${geistSans.className} bg-slate-900 text-slate-100 antialiased min-h-screen`}>
        <Providers authDisabled={authDisabled}>
          <Navbar authDisabled={authDisabled} />
          <main className="max-w-7xl mx-auto px-4 py-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
