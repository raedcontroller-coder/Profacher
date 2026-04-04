import { auth, signOut } from "../../auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background text-on-surface p-8">
      {/* Abstract Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[10%] w-[30%] h-[40%] bg-primary/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[25%] h-[35%] bg-tertiary-container/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        <header className="flex justify-between items-center liquid-glass p-6 rounded-2xl border border-outline-variant/10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Painel <span className="text-primary">Global Admin</span></h1>
            <p className="text-on-surface-variant">Bem-vindo, {session.user?.name}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="bg-surface-container-highest/50 border border-outline-variant/20 text-on-surface hover:bg-error/10 hover:text-error px-6 py-2 rounded-xl font-semibold transition-all">
              Sair
            </button>
          </form>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="liquid-glass p-6 rounded-2xl border border-outline-variant/10 text-center">
            <h2 className="text-sm font-mono uppercase tracking-widest text-outline">Instituições</h2>
            <p className="text-4xl font-bold mt-2">0</p>
          </div>
          <div className="liquid-glass p-6 rounded-2xl border border-outline-variant/10 text-center">
            <h2 className="text-sm font-mono uppercase tracking-widest text-outline">Usuários</h2>
            <p className="text-4xl font-bold mt-2">1</p>
          </div>
          <div className="liquid-glass p-6 rounded-2xl border border-outline-variant/10 text-center">
            <h2 className="text-sm font-mono uppercase tracking-widest text-outline">IA Usage</h2>
            <p className="text-4xl font-bold mt-2">0</p>
          </div>
        </div>

        <div className="liquid-glass p-8 rounded-[2rem] border border-outline-variant/10 h-64 flex flex-col items-center justify-center text-center space-y-4">
          <span className="material-symbols-outlined text-outline text-5xl opacity-30">construction</span>
          <p className="italic text-on-surface-variant max-w-sm">
            O painel administrativo do Profacher 2.0 foi inicializado com sucesso e está pronto para novas funcionalidades.
          </p>
        </div>
      </div>
    </div>
  );
}
