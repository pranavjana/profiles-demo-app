import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Geist is Vercel's typeface — clean and neutral, a good fit for a chat UI.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Chat · TinyFish Web Agent",
  description:
    "A minimal ChatGPT-style starter built with Next.js and the Vercel AI SDK, " +
    "streaming through OpenRouter with a TinyFish web-agent tool that showcases " +
    "browser profiles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground min-h-full">
        {children}
      </body>
    </html>
  );
}
