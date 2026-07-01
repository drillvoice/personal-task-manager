import { AppFrame } from "@/components/app-frame";
import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppFrame>
      <main className="flex-1">{children}</main>
      <BottomNav />
    </AppFrame>
  );
}
