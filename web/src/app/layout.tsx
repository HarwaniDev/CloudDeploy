import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "../styles/globals.css"
// import { ThemeProvider } from "~/components/theme-provider"
import { Suspense } from "react"
import { TRPCReactProvider } from "~/trpc/react"
import Providers from "./providers"

export const metadata: Metadata = {
  title: "Clouddeploy",
  description: "Deploy your react app with a single click",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Providers>
          <TRPCReactProvider>
            <Suspense fallback={<div>Loading...</div>}>
              {/* <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange> */}
              {children}
              <Analytics />
              {/* </ThemeProvider> */}
            </Suspense>
          </TRPCReactProvider>
        </Providers>
      </body>
    </html>
  )
}
