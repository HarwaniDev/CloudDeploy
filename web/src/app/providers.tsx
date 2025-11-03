"use client"

import { SessionProvider, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type React from "react";
import { Toaster } from "react-hot-toast";

function AuthInterceptor({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Store original fetch
    const originalFetch = window.fetch;

    // Intercept fetch calls to GitHub API
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Check if this is a GitHub API call that failed with auth error
      const url = args[0];
      if (
        typeof url === "string" &&
        url.includes("api.github.com") &&
        (response.status === 401 || response.status === 403) &&
        session?.user
      ) {
        // Token is invalid, redirect to home
        router.push("/");
      }

      return response;
    };

    // Cleanup: restore original fetch
    return () => {
      window.fetch = originalFetch;
    };
  }, [session, router]);

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AuthInterceptor>
                {children}
                <Toaster position="top-right" />
            </AuthInterceptor>
        </SessionProvider>
    );
}