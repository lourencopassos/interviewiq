import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { MockToggle } from "@/components/mock-toggle";
import { SiteNav } from "@/components/site-nav";
import { themeInitScript } from "@/components/theme-toggle";
import "./globals.css";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "InterviewIQ — Mock interviews that know the company",
  description:
    "Paste a job description, get an adaptive voice interview from an AI that researched the company, and walk away with a coaching report and study plan.",
  openGraph: {
    title: "InterviewIQ — Mock interviews that know the company",
    description:
      "Adaptive voice interviews with real company research and a coaching report at the end. Self-hosted, bring your own keys.",
    type: "website",
    siteName: "InterviewIQ",
  },
  twitter: {
    card: "summary_large_image",
    title: "InterviewIQ — Mock interviews that know the company",
    description:
      "Adaptive voice interviews with real company research and a coaching report at the end.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={mono.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen font-mono">
        <SiteNav />
        <main className="min-h-screen">{children}</main>
        <MockToggle />
      </body>
    </html>
  );
}
