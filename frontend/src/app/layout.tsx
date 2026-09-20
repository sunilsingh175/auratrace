import type { Metadata } from "next";
import "@/app/globals.css";
import { AuthProvider } from "@/context/auth-context";

export const metadata: Metadata = {
  title: "Automatic Backend Diagnostics Platform | AI Observability & Crash Diagnostics",
  description:
    "Automatic Backend Diagnostics Platform - Autonomous telemetry ingestion, unsupervised Isolation Forest anomaly detection, and automated RAG self-healing root-cause diagnostics.",
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#080c14] text-slate-100 font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
