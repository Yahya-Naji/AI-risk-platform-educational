import type { Metadata } from "next";
import { Sora, DM_Sans, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import ThemeProvider from "@/components/ThemeProvider";
import FloatingChat from "@/components/FloatingChat";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const sora = Sora({ subsets: ["latin"], variable: "--font-display", weight: ["400","500","600","700","800"] });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "RiskAI – AI-Powered Risk Management Platform",
  description: "Intelligent risk identification, validation, and remediation powered by AI",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable, sora.variable, dmSans.variable)} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('riskai-theme');
                  if (theme === 'light') {
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={dmSans.className}>
        <ThemeProvider>
          {children}
          <FloatingChat />
        </ThemeProvider>
      </body>
    </html>
  );
}
