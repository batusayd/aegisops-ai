import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AegisOps AI | Omnichannel AI Operations & Support Hub",
  description:
    "Production AI Support Triage, Qdrant Vector RAG, Cryptographic HITL Approval Engine & Multilingual (PL/EN/TR) Community Automation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#070A12] text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
