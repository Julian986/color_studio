import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel - Colorstudio Moscardini",
  manifest: "/manifest-panel.webmanifest",
};

export default function PanelTurnosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
