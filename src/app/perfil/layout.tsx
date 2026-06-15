import type { ReactNode } from "react";

import { PerfilSessionProvider } from "@/components/perfil/perfil-session-provider";

export default function PerfilLayout({ children }: { children: ReactNode }) {
  return (
    <PerfilSessionProvider>
      <div className="min-h-screen bg-white text-gray-900">{children}</div>
    </PerfilSessionProvider>
  );
}
