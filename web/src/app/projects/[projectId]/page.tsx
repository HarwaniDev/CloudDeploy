"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table"
import { Badge } from "~/components/ui/badge"
import { LogsViewer } from "~/components/logs-viewer"
import { api } from "~/trpc/react"


export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data, refetch, isFetching } = api.project.getProject.useQuery({ projectId: projectId as string })
  const utils = api.useUtils()
  const startDeployment = api.project.startDeployment.useMutation({
    onSuccess: async () => {
      // refetch project to get the new deployment and logs
      await utils.project.getProject.invalidate({ projectId: projectId as string })
      await refetch()
    },
  })

  return (
    <main className="min-h-dvh bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold">clouddeploy</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard">Back</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-1">
          <h2 className="text-xl font-semibold">{data?.name || "Project"}</h2>
          <p className="text-sm text-muted-foreground">
            {data?.name && data.branch ? `Branch: ${data.branch}` : "Loading repo..."}
          </p>
          <p className="text-sm text-muted-foreground">
            {data?.name && data.deployUrl ? `url: ${data.deployUrl}` : "Loading url..."}
          </p>
        </div>

        <Tabs defaultValue="deployments" className="w-full">
          <TabsList>
            <TabsTrigger value="deployments">Deployments</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="deployments" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Deployments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void refetch()}
                    disabled={isFetching}
                  >
                    {isFetching ? "Refreshing…" : "Refresh"}
                  </Button>
                  <Button
                    className="bg-primary text-primary-foreground"
                    onClick={() => startDeployment.mutate({ projectId: String(projectId) })}
                    disabled={startDeployment.isPending}
                  >
                    {startDeployment.isPending ? "Starting…" : "Start a new deployment"}
                  </Button>
                </div>
                {data?.deployments && data.deployments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.deployments.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono text-xs">{d.id}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                d.status === "SUCCESS" ? "default" : d.status === "FAILED" ? "destructive" : "secondary"
                              }
                            >
                              {d.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(d.createdAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No deployment record found. Start a new deployment.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Live Logs (latest deployment)</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.deployments && data.deployments.length > 0 ? (
                  <LogsViewer projectId={String(projectId)} latestDeploymentId={data.deployments[0]!.id} />
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">No logs found. Start a new deployment.</div>
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground"
                      onClick={() => startDeployment.mutate({ projectId: String(projectId) })}
                      disabled={startDeployment.isPending}
                    >
                      {startDeployment.isPending ? "Starting…" : "Start a new deployment"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
