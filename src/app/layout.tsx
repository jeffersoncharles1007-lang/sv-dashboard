import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SV Dashboard v2 - SV Elétrica",
  description: "Painel de gestão comercial SV Elétrica - KPIs, pipeline, conversão e performance",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} min-h-full flex flex-col antialiased font-sans`}>
        {children}
      </body>
    </html>
  );
}
