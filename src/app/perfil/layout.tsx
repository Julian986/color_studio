import type { ReactNode } from "react";

import { PerfilSessionProvider } from "@/components/perfil/perfil-session-provider";

export default function PerfilLayout({ children }: { children: ReactNode }) {
  return (
    <PerfilSessionProvider>
      <div className="min-h-screen bg-[#111111] text-white">{children}</div>
    </PerfilSessionProvider>
  );
}
