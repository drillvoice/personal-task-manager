import { AppFrame } from "@/components/app-frame";
import { TopNav } from "@/components/bottom-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppFrame>
      <TopNav />
      <main className="flex-1 pt-[52px]">{children}</main>
    </AppFrame>
  );
}
