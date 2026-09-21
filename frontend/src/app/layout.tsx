import type { Metadata } from "next";
import "@/app/globals.css";
import { AuthProvider } from "@/context/auth-context";
import { NotificationProvider } from "@/context/notification-context";

export const metadata: Metadata = {
  title: "Automatic Backend Detection | AI Observability & Crash Diagnostics",
  description:
    "Automatic Backend Detection - Autonomous telemetry ingestion, unsupervised Isolation Forest anomaly detection, and automated RAG self-healing root-cause diagnostics.",
  icons: {
    icon: "/logo-icon.svg",
    shortcut: "/logo-icon.svg",
    apple: "/logo-icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased selection:bg-red-500/20 selection:text-red-900">
        <AuthProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
