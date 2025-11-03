"use client"

import { useAuthGuard } from "~/hooks/useAuthGuard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { session, status } = useAuthGuard()

  // Show nothing while validating or redirecting
  if (status === "loading" || !session?.user || !session.user.accessToken) {
    return null
  }

  return <>{children}</>
}

