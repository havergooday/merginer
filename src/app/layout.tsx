import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const galmuri = localFont({
  src: "../../public/assets/fonts/Galmuri9.ttf",
  variable: "--font-galmuri",
  display: "swap",
});

export const metadata: Metadata = {
  title: "강화 실험장",
  description: "강화/탐험 루프 실험용 RPG UI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistMono.variable} ${galmuri.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

