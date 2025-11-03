"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

/**
 * Global hook to check authentication and redirect if user is not logged in or token is invalid
 * Should be used in layouts for protected routes
 */
export function useAuthGuard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Only check if session is loaded
    if (status === "loading") return

    // If no session, redirect to home
    if (!session?.user) {
      toast.error("Please login first")
      router.push("/")
      return
    }

    // Check if accessToken exists
    if (session.user && !session.user.accessToken) {
      toast.error("Please login first")
      router.push("/")
      return
    }

    // Validate token by making a test request to GitHub API
    const validateToken = async () => {
      if (!session.user?.accessToken) return

      try {
        const resp = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
            Accept: "application/vnd.github+json",
          },
        })

        // If token is invalid (401/403), redirect to home
        if (resp.status === 401 || resp.status === 403) {
          toast.error("Please login first")
          router.push("/")
        }
      } catch (error) {
        // On network error, don't redirect (might be offline)
        // Only redirect on authentication errors
      }
    }

    validateToken()
  }, [session, status, router])

  return { session, status }
}

