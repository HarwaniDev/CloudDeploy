"use client"

import Link from "next/link"
import { Button } from "~/components/ui/button"
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { date } from "zod/v4";

export default function HomePage() {
  const session = useSession();
  const router = useRouter();

  const handleSignIn = async () => {
    if (!session.data) {
      await signIn("github", {
        redirectTo: "/dashboard"
      })
    } else {
      await signOut({
        redirectTo: "/"
      })
    }
  };

  // useEffect(() => {
  //   if (session.status === "authenticated") {
  //     router.push("/dashboard");    
  //   }
  // }, []);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-2">
            {/* <div aria-hidden className="size-5 rounded-sm bg-primary" /> */}
            <span className="font-semibold">clouddeploy</span>
          </div>
          <nav className="flex items-center gap-2">
            {session.data && session.data.user.name}
            <Button variant="default" className="bg-primary text-primary-foreground cursor-pointer" onClick={handleSignIn}>
              {session.data ? "Sign out" : "Sign in with GitHub"}
            </Button>
          </nav>
        </div>
      </header>

      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">Ship React apps instantly</h1>
          <p className="mt-4 text-pretty text-muted-foreground">
            A sleek frontend for deploying React apps with one click. View deployments and real-time logs
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/dashboard">
              <Button size="lg" className="bg-primary text-primary-foreground">
                Continue with GitHub
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline">
                View Dashboard
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-12 rounded-lg border bg-card text-card-foreground">
          <div className="p-4 border-b text-sm text-muted-foreground">Preview</div>
          <div className="p-4">
            <div className="aspect-[16/9] w-full rounded-md border bg-muted" />
          </div>
        </div>
      </section>
    </main>
  )
}
