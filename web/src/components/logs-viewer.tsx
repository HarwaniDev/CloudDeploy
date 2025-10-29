"use client"

import useSWR from "swr"
import { useMemo } from "react"
import { Button } from "~/components/ui/button"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type LogEntry = { ts: string; level: "info" | "warn" | "error"; message: string }

export function LogsViewer({ projectId, latestDeploymentId }: { projectId: string; latestDeploymentId?: string }) {
  // fetch latest deployment id first (only if not provided by parent)
  const { data: deploymentMeta } = useSWR<{ latestDeploymentId: string }>(
    latestDeploymentId ? null : `/api/projects/${projectId}`,
    async (url) => {
      const res = await fetch(url).then((r) => r.json())
      const latestDeploymentId = res?.deployments?.[0]?.id
      return { latestDeploymentId }
    },
    { revalidateOnFocus: false },
  )

  const depId = latestDeploymentId ?? deploymentMeta?.latestDeploymentId

  const { data, isLoading, mutate } = useSWR<{ logs: LogEntry[] }>(
    depId ? `/api/deployments/${depId}/logs` : null,
    fetcher,
    {
      refreshInterval: 2000,
      revalidateOnFocus: false,
    },
  )

  const rendered = useMemo(
    () =>
      (data?.logs ?? []).map((l, idx) => (
        <div key={idx} className="flex gap-3 text-sm leading-6">
          <span className="text-muted-foreground tabular-nums min-w-40">{new Date(l.ts).toLocaleTimeString()}</span>
          <span
            className={
              l.level === "error"
                ? "text-destructive"
                : l.level === "warn"
                  ? "text-yellow-600 dark:text-yellow-500"
                  : "text-foreground"
            }
          >
            {l.level.toUpperCase()}
          </span>
          <span className="text-pretty">{l.message}</span>
        </div>
      )),
    [data?.logs],
  )

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="text-xs text-muted-foreground">
          Deployment: <span className="font-mono">{depId || "..."}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => mutate()}>
            Refresh
          </Button>
        </div>
      </div>
      <div className="max-h-[420px] overflow-auto bg-muted/30 p-3 font-mono text-xs">
        {!depId ? (
          <div className="text-muted-foreground">No logs found.</div>
        ) : isLoading ? (
          <div className="text-muted-foreground">Loading logs…</div>
        ) : (
          rendered
        )}
      </div>
    </div>
  )
}
