import { AppFrame } from "@/components/app-frame";
import { AppNav } from "@/components/app-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="md:pl-[208px]">
      <AppNav />
      <AppFrame>
        <main className="flex-1 pt-[52px] md:pt-0">{children}</main>
      </AppFrame>
    </div>
  );
}
