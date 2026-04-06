import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profacher | Coordenador",
  description: "Painel de Coordenação — Profacher",
};

export default function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
