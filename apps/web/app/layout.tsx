import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { MockToggle } from "@/components/mock-toggle";
import { SiteNav } from "@/components/site-nav";
import { themeInitScript } from "@/components/theme-toggle";
import { I18nProvider, getDictionary, LOCALE_TAGS } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700", "800"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { meta } = getDictionary(locale).landing;
  return {
    title: meta.title,
    description: meta.description,
    openGraph: { title: meta.title, description: meta.description, type: "website", siteName: "InterviewIQ" },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={LOCALE_TAGS[locale]} className={mono.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen font-mono">
        <I18nProvider locale={locale}>
          <SiteNav />
          <main className="min-h-screen">{children}</main>
          <MockToggle />
        </I18nProvider>
      </body>
    </html>
  );
}
