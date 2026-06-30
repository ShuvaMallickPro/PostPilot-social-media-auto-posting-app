import { DashboardHeader } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <DashboardHeader />

        <main className="flex-1 overflow-y-auto bg-grid-pattern">
          <div className="bg-glow-brand">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
