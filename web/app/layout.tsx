import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Profacher 2.0",
  description: "Plataforma de Gestão Profissional para Professores",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Berkeley+Mono&display=swap" rel="stylesheet" />
        <link href="https://fonts.materialdesignicons.com/2.0.46/css/materialdesignicons.min.css" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
