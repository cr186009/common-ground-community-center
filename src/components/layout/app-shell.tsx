import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-4 px-3 py-3 md:px-4 md:py-4">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <TopBar />
          <main className="pb-24 pt-4 md:pt-5 lg:pb-8">{children}</main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
