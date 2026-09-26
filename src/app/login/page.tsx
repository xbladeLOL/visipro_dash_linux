import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  async function login(formData: FormData) {
    "use server";
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard"
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form action={login} className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-soft">
        <h1 className="text-2xl font-semibold">VisiPro</h1>
        <p className="mt-1 text-sm text-muted-foreground">Connexion au dashboard interne.</p>
        <div className="mt-6 space-y-4">
          <Input name="email" type="email" placeholder="email" required />
          <Input name="password" type="password" placeholder="mot de passe" required />
          <Button className="w-full">Se connecter</Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Démo seed : admin@visipro.local / visipro-demo</p>
      </form>
    </main>
  );
}
