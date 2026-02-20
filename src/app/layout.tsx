import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QA Test Case Validator",
  description:
    "AI-powered test case validation tool for QA engineers. Upload CSV test cases and get instant SOP-compliant reviews, scores, and improvement suggestions.",
  icons: {
    icon: '/verify.png',
    shortcut: '/verify.png',
    apple: '/verify.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <div className="gradient-bg" />
        <AuthProvider>{children}</AuthProvider>
        <footer className="py-6 text-center text-xs text-stone-400">
          <p>
            <a
              href="https://www.flaticon.com/free-icons/verification"
              title="verification icons"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-500 transition-colors"
            >
              Verification icons created by Anggara - Flaticon
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
