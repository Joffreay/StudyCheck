import { redirect } from "next/navigation";
import { loginWithCredentials } from "@/lib/auth/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  async function loginAction(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const user = await loginWithCredentials(email, password);

    if (!user) {
      redirect("/login?error=1");
    }

    redirect("/");
  }

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-teal-800 via-teal-700 to-slate-900 px-10 py-16 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold">
            SC
          </div>
          <h1 className="max-w-md text-4xl font-semibold tracking-tight">StudyCheck</h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-teal-50/90">
            Pré-tri bibliographique transparent pour une revue de portée sur l&apos;improvisation théâtrale
            en formation des professionnels et étudiants en santé.
          </p>
        </div>
        <div className="space-y-3 text-sm text-teal-50/80">
          <p>Score de priorisation ; exclusion automatique si langue hors FR/EN</p>
          <p>Décisions traçables par lecteur</p>
          <p>Calibration double lecture prête à être activée</p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <form action={loginAction} className="card w-full max-w-md p-8">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Connexion</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Accès lecteur</h2>
            <p className="mt-2 text-sm text-slate-600">
              Utilisez l&apos;un des comptes provisionnés pour la calibration.
            </p>
          </div>

          {params.error ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Identifiants invalides. Réessayez.
            </div>
          ) : null}

          <label className="mb-4 block">
            <span className="label">Email</span>
            <input
              name="email"
              type="email"
              required
              placeholder="lecteur1@studycheck.local"
              className="input"
            />
          </label>

          <label className="mb-6 block">
            <span className="label">Mot de passe</span>
            <input name="password" type="password" required placeholder="••••••••" className="input" />
          </label>

          <button type="submit" className="btn-primary w-full">
            Se connecter
          </button>

          <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
            <p className="font-medium text-slate-800">Comptes de démonstration</p>
            <p>lecteur1@studycheck.local / lecteur1</p>
            <p>lecteur2@studycheck.local / lecteur2</p>
          </div>
        </form>
      </section>
    </main>
  );
}
