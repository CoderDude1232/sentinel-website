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
    <div className="min-h-screen">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-5 px-5 pb-6 pt-4 sm:px-8 md:grid-cols-[240px_1fr]">
        <aside className="dashboard-nav-shell h-fit p-4 md:sticky md:top-4">
          <DashboardNav />
        </aside>
        <section className="dashboard-content dashboard-glass p-5 sm:p-6">
          {children}
        </section>
      </div>
    </div>
  );
}
