import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Guardrails Protocol",
  description:
    "On-chain policy enforcement for Solana AI agents with allow-lists, spending budgets, and a real-time kill switch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
