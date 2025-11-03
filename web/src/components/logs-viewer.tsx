"use client"

import { useMemo } from "react"
import { Button } from "~/components/ui/button"
import { api } from "~/trpc/react"

function parseLogLevel(message: string): "info" | "warn" | "error" {
  const lowerMessage = message.toLowerCase()
  if (lowerMessage.includes("error") || lowerMessage.includes("failed") || lowerMessage.includes("fail")) {
    return "error"
  }
  if (lowerMessage.includes("warn") || lowerMessage.includes("warning")) {
    return "warn"
  }
  return "info"
}

export function LogsViewer({ projectId, latestDeploymentId }: { projectId: string; latestDeploymentId?: string }) {
  const { data: logs, isLoading, refetch } = api.project.getLogs.useQuery(
    { projectId },
    {
      refetchInterval: 2000,
    },
  )

  const rendered = useMemo(() => {
    if (!logs) return null

    return logs.map((log) => {
      const level = parseLogLevel(log.message)
      return (
        <div key={log.id} className="flex gap-3 text-sm leading-6">
          <span className="text-muted-foreground tabular-nums min-w-40">
            {new Date(log.createdAt).toLocaleTimeString()}
          </span>
          <span
            className={
              level === "error"
                ? "text-destructive"
                : level === "warn"
                  ? "text-yellow-600 dark:text-yellow-500"
                  : "text-foreground"
            }
          >
            {level.toUpperCase()}
          </span>
          <span className="text-pretty">{log.message}</span>
        </div>
      )
    })
  }, [logs])

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="text-xs text-muted-foreground">
          Deployment: <span className="font-mono">{latestDeploymentId || "..."}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Refresh
          </Button>
        </div>
      </div>
      <div className="max-h-[420px] overflow-auto bg-muted/30 p-3 font-mono text-xs">
        {isLoading ? (
          <div className="text-muted-foreground">Loading logs…</div>
        ) : !logs || logs.length === 0 ? (
          <div className="text-muted-foreground">No logs found.</div>
        ) : (
          rendered
        )}
      </div>
    </div>
  )
}
