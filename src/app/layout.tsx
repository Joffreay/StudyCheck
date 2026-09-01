import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyCheck — Pré-tri bibliographique",
  description: "Application de pré-tri bibliographique pour revue de portée en santé",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
