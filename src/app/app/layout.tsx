import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { parseSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const session = parseSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-[calc(100vh-5.5rem)] px-3 pb-4 pt-2 sm:px-4 lg:px-5">
      <div className="grid min-h-[calc(100vh-7rem)] w-full grid-cols-1 gap-4 md:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="dashboard-nav-shell h-fit p-4 md:sticky md:top-3 md:max-h-[calc(100vh-1.5rem)] md:overflow-y-auto">
          <DashboardNav />
        </aside>
        <section className="dashboard-content dashboard-glass p-4 sm:p-5 md:p-6">
          {children}
        </section>
      </div>
    </div>
  );
}
