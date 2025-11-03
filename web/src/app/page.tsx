"use client"

import Link from "next/link"
import { Button } from "~/components/ui/button"
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { date } from "zod/v4";
import Image from "next/image";
import { api } from "~/trpc/react";

type Step = {
  title: string;
  description: string;
  imageSrc: string;
};

function DottedArrow({ direction }: { direction: "ltr" | "rtl" }) {
  return (
    <div className="relative my-8 hidden md:block">
      <svg
        className="w-full h-10"
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
        style={{ direction: direction === "rtl" ? "rtl" : "ltr" }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="currentColor" />
          </marker>
        </defs>
        <path
          d="M5 10 C 30 0, 70 20, 95 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          markerEnd="url(#arrowhead)"
        />
      </svg>
    </div>
  );
}

function StepRow({ step, index }: { step: Step; index: number }) {
  const isEven = index % 2 === 0; // 0-based: 0,2,4 -> left image
  return (
    <div className="grid md:grid-cols-2 gap-6 items-center">
      {isEven ? (
        <Image
          src={step.imageSrc}
          alt={step.title}
          width={1200}
          height={675}
          className="w-full rounded-md border"
        />
      ) : (
        <div className="order-2 md:order-1">
          <h3 className="text-xl font-semibold">{step.title}</h3>
          <p className="mt-2 text-muted-foreground">{step.description}</p>
        </div>
      )}

      {isEven ? (
        <div className="order-2 md:order-2">
          <h3 className="text-xl font-semibold">{step.title}</h3>
          <p className="mt-2 text-muted-foreground">{step.description}</p>
        </div>
      ) : (
        <Image
          src={step.imageSrc}
          alt={step.title}
          width={1200}
          height={675}
          className="order-1 md:order-2 w-full rounded-md border"
        />
      )}
    </div>
  );
}

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

  const { data: deployedApps, isLoading } = api.project.getRecentDeployedProjects.useQuery({ limit: 6 });

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
          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">Ship React Apps Instantly</h1>
          <p className="mt-4 text-pretty text-muted-foreground">
            No bs platform for deploying React apps with one click. View deployments and logs.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/dashboard">
              <Button size="lg" className="bg-primary text-primary-foreground">
                View Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div className="mx-auto mt-16 max-w-5xl">
          <h2 className="text-center text-2xl font-semibold">How it works</h2>
          <div className="mt-8 space-y-10">
            {[
              {
                title: "Confirm project details",
                description: "Select repository and confirm default branch.",
                imageSrc: "/step2.png",
              },
              {
                title: "Track deployment status",
                description: "Watch builds kick off and complete in seconds.",
                imageSrc: "/step3.png",
              },
              {
                title: "Inspect build logs",
                description: "See build output and logs.",
                imageSrc: "/step4.png",
              },
            ].map((s, i) => (
              <div key={i}>
                <StepRow step={s as Step} index={i} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/20">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <h2 className="text-center text-2xl font-semibold">Applications deployed with clouddeploy</h2>
          <p className="mt-2 text-center text-muted-foreground">A few public apps built by our users.</p>
          {isLoading ? (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-md border animate-pulse bg-muted" />
              ))}
            </div>
          ) : (
            <>
              {(!deployedApps || deployedApps.length === 0) ? (
                <p className="mt-8 text-center text-muted-foreground">No public deployments yet.</p>
              ) : (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {deployedApps.map((app) => (
                    <a
                      key={app.url}
                      href={`https://${app.url}`.replace(/^https?:\/\//, "https://")}
                      target="_blank"
                      rel="noreferrer"
                      className="group rounded-md border p-4 hover:shadow-sm transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{app.name}</span>
                        <span className="text-xs text-muted-foreground group-hover:text-foreground">Visit →</span>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground truncate">{app.url}</div>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  )
}
