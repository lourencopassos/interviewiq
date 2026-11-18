import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MockToggle } from "@/components/mock-toggle";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "InterviewIQ — AI-Powered Mock Interviews",
  description:
    "Practice real interviews with an AI that knows the company and role. Get detailed coaching reports with study plans.",
  openGraph: {
    title: "InterviewIQ — AI-Powered Mock Interviews",
    description:
      "Practice real interviews with an AI that researches the company. Adaptive audio interviews with detailed coaching reports.",
    type: "website",
    siteName: "InterviewIQ",
  },
  twitter: {
    card: "summary_large_image",
    title: "InterviewIQ — AI-Powered Mock Interviews",
    description:
      "Practice real interviews with an AI that researches the company. Adaptive audio interviews with detailed coaching reports.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <main className="min-h-screen">{children}</main>
        <MockToggle />
      </body>
    </html>
  );
}
