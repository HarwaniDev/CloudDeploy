"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Skeleton } from "~/components/ui/skeleton"
import { api } from "~/trpc/react"

type Project = {
  id: string
  userId: string
  name: string
  repoUrl: string
  branch: string
  buildStatus: "PENDING" | "BUILDING" | "SUCCESS" | "FAILED"
  deployUrl: string | null
  subdomain: string
  lastDeployedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
export default function DashboardPage() {
  const { data: session } = useSession();
  const { data, isLoading, refetch } = api.project.getProjects.useQuery();
  const addProject = api.project.addProject.useMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [projectName, setProjectName] = useState("");
  const [branch, setBranch] = useState("main");

  useEffect(() => {
    if (!isModalOpen) return;
    if (!session?.user?.accessToken) {
      setReposError("Missing GitHub access token. Please re-authenticate.");
      return;
    }
    let cancelled = false;
    const fetchRepos = async () => {
      try {
        setIsLoadingRepos(true);
        setReposError(null);
        const resp = await fetch("https://api.github.com/user/repos?per_page=100", {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
            Accept: "application/vnd.github+json",
          },
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || `GitHub error ${resp.status}`);
        }
        const json = (await resp.json()) as any[];
        const mapped: GitHubRepo[] = json.map((r) => ({
          id: String(r.id),
          name: r.name as string,
          fullName: r.full_name as string,
          defaultBranch: (r.default_branch as string) ?? "main",
          cloneUrl: r.clone_url as string,
          sshUrl: r.ssh_url as string,
          htmlUrl: r.html_url as string,
          description: (r.description as string | null) ?? null,
          private: Boolean(r.private),
        }));
        if (!cancelled) setRepos(mapped);
      } catch (e: any) {
        if (!cancelled) setReposError(e?.message ?? "Failed to load repositories");
      } finally {
        if (!cancelled) setIsLoadingRepos(false);
      }
    };
    fetchRepos();
    return () => {
      cancelled = true;
    };
  }, [isModalOpen, session?.user?.accessToken]);

  useEffect(() => {
    if (selectedRepo) {
      setProjectName(selectedRepo.name);
      setBranch(selectedRepo.defaultBranch || "main");
    }
  }, [selectedRepo]);

  const canSubmit = useMemo(() => {
    return Boolean(selectedRepo && projectName.trim() && branch.trim()) && !addProject.isPending;
  }, [selectedRepo, projectName, branch, addProject.isPending]);

  const handleCreate = async () => {
    if (!selectedRepo) return;
    try {
      await addProject.mutateAsync({
        name: projectName.trim(),
        repoUrl: selectedRepo.cloneUrl,
        branch: branch.trim() || "main",
      });
      await refetch();
      setIsModalOpen(false);
      setSelectedRepo(null);
    } catch (e) {
    }
  };
  return (
    <main className="min-h-dvh bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Projects</h2>
          <Button className="bg-primary text-primary-foreground" onClick={() => setIsModalOpen(true)}>
            New Project
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-center">
            <div className="mb-2 text-lg font-medium">No projects yet</div>
            <div className="mb-4 text-sm text-muted-foreground">Create your first project to get started.</div>
            <Button asChild className="bg-primary text-primary-foreground">
              <Link href="/projects/new">New Project</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((p: Project) => {
              const lastDeployed = p.lastDeployedAt ? p.lastDeployedAt.toLocaleString() : "Never";
              const repoAndBranch = `${p.repoUrl} · ${p.branch}`;
              return (
                <Card key={p.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <CardDescription className="text-xs truncate">{repoAndBranch}</CardDescription>
                    <CardDescription className="text-xs truncate">
                      {p.subdomain}{p.deployUrl ? ` · ${p.deployUrl}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {`Status: ${p.buildStatus} · Last deployed: ${lastDeployed}`}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/projects/${p.id}`}>Open</Link>
                        </Button>
                        <Button size="sm" asChild className="bg-primary text-primary-foreground">
                          <Link
                            href={p.deployUrl ? `https://${p.deployUrl}` : "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Visit
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl rounded-lg border bg-card p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-base font-semibold">New Project</div>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Close</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-1">
                <div className="mb-2 text-sm font-medium">Select a repository</div>
                <div className="max-h-72 overflow-auto rounded border">
                  {isLoadingRepos ? (
                    <div className="p-3 text-sm text-muted-foreground">Loading repositories…</div>
                  ) : reposError ? (
                    <div className="p-3 text-sm text-destructive">{reposError}</div>
                  ) : repos.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No repositories found.</div>
                  ) : (
                    <ul>
                      {repos.map((r) => (
                        <li key={r.id}>
                          <button
                            className={`flex w-full items-start gap-2 p-3 text-left hover:bg-accent ${selectedRepo?.id === r.id ? "bg-accent" : ""
                              }`}
                            onClick={() => setSelectedRepo(r)}
                          >
                            <div className="flex-1">
                              <div className="text-sm font-medium">{r.fullName}</div>
                              <div className="text-xs text-muted-foreground">
                                {r.private ? "Private" : "Public"} · default: {r.defaultBranch}
                              </div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="md:col-span-1">
                <div className="mb-2 text-sm font-medium">Project details</div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Project name</label>
                    <input
                      className="w-full rounded border bg-background px-3 py-2 text-sm"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="My Project"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Branch</label>
                    <input
                      className="w-full rounded border bg-background px-3 py-2 text-sm"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="main"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Repository URL</label>
                    <input
                      className="w-full cursor-not-allowed rounded border bg-muted px-3 py-2 text-sm"
                      value={selectedRepo?.cloneUrl ?? "Select a repository"}
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-primary text-primary-foreground"
                onClick={handleCreate}
                disabled={!canSubmit}
              >
                {addProject.isPending ? "Creating…" : "Create Project"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

type GitHubRepo = {
  id: string
  name: string
  fullName: string
  defaultBranch: string
  cloneUrl: string
  sshUrl: string
  htmlUrl: string
  description: string | null
  private: boolean
}
