import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
    createTRPCRouter,
    protectedProcedure,
} from "~/server/api/trpc";
import { triggerJob } from "~/lib/runJob";

export const projectRouter = createTRPCRouter({
    getProjects: protectedProcedure
        .query(async ({ ctx }) => {
            const projects = await ctx.db.project.findMany({
                where: {
                    userId: ctx.session.user.id,
                },
                orderBy: {
                    updatedAt: "desc",
                },
            });
            return projects ?? [];
        }),
    addProject: protectedProcedure
        .input(
            z.object({
                name: z.string().trim().min(1, "Project name is required").max(64),
                repoUrl: z
                    .string()
                    .trim()
                    .refine(
                        (url) => {
                            // Allow HTTPS Git URLs or SSH Git URLs
                            const httpsGit = /^https:\/\/[\w.-]+\/[\w.-]+\/[\w.-]+(\.git)?(\/?|#.*)?$/i;
                            const sshGit = /^git@([\w.-]+):[\w.-]+\/[\w.-]+(\.git)?$/i;
                            return httpsGit.test(url) || sshGit.test(url);
                        },
                        {
                            message:
                                "Invalid repository URL. Use HTTPS (https://...) or SSH (git@...) Git URL.",
                        },
                    ),
                branch: z
                    .string()
                    .trim()
                    .max(64)
                    .regex(/^[A-Za-z0-9._\-\/]+$/, "Invalid branch name")
                    .optional()
                    .default("main"),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            const normalizedName = input.name.trim();
            const normalizedRepoUrl = input.repoUrl.trim();
            const branch = (input.branch ?? "main").trim();

            // Edge case: prevent duplicate repo per user
            const existingForUser = await ctx.db.project.findFirst({
                where: {
                    userId,
                    repoUrl: normalizedRepoUrl,
                },
                select: { id: true },
            });
            if (existingForUser) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "You already added a project for this repository.",
                });
            }

            // Generate a unique subdomain based on project name
            const baseSubdomain = generateSubdomainFromName(normalizedName);
            const uniqueSubdomain = await findAvailableSubdomain(ctx, baseSubdomain);

            const newProject = await ctx.db.project.create({
                data: {
                    userId,
                    name: normalizedName,
                    repoUrl: normalizedRepoUrl,
                    branch,
                    subdomain: uniqueSubdomain,
                },
            });

            return newProject;
        }),
    // get details for a specific project
    getProject: protectedProcedure
        .input(z.object({
            projectId: z.string()
        }))
        .query(async ({ ctx, input }) => {
            const project = await ctx.db.project.findUnique({
                where: {
                    id: input.projectId
                },
                include: {
                    domains: true,
                    deployments: {
                        orderBy: { createdAt: "desc" },
                    },
                    logs: {
                        orderBy: { createdAt: "desc" },
                    },
                }
            });
            if (!project) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Project not found",
                });
            }
            return project;
        }),

    // start a new deployment for a project
    startDeployment: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Ensure project belongs to the current user
            const project = await ctx.db.project.findFirst({
                where: { id: input.projectId, userId: ctx.session.user.id },
                select: { id: true, repoUrl: true },
            });
            if (!project) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
            }

            const deployment = await ctx.db.deployment.create({
                data: {
                    projectId: input.projectId,
                    status: "PENDING",
                },
            });
            triggerJob(ctx.headers, deployment.id, input.projectId, project.repoUrl)
                .then(() => console.log(`Job triggered for project ${input.projectId}`))
                .catch((err) => console.error("Error triggering job:", err));
            return deployment;
        }),
    // update deployment status for a project
    updateDeployment: protectedProcedure
        .input(z.object({
            deploymentId: z.string(),
            buildStatus: z.enum([
                "PENDING",
                "BUILDING",
                "SUCCESS",
                "FAILED"
            ])
        }))
        .mutation(async ({ input, ctx }) => {
            const deployment = await ctx.db.deployment.findUnique({
                where: {
                    id: input.deploymentId
                }
            });
            if (!deployment) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Deployment not found" });
            };
            await ctx.db.deployment.update({
                where: {
                    id: input.deploymentId
                },
                data: {
                    status: input.buildStatus
                }
            });
        })
})

function generateSubdomainFromName(name: string): string {
    // Convert name to a DNS-safe subdomain slug
    const lowered = name.toLowerCase();
    const replaced = lowered.replace(/[^a-z0-9]+/g, "-");
    const trimmed = replaced.replace(/^-+|-+$/g, "");
    const collapsed = trimmed.replace(/-+/g, "-");
    const limited = collapsed.slice(0, 63);
    return limited || "project"; // fallback if name becomes empty
}

async function findAvailableSubdomain(
    ctx: { db: any },
    base: string,
): Promise<string> {
    let attempt = 0;
    while (true) {
        const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
        const found = await ctx.db.project.findUnique({
            where: { subdomain: candidate },
            select: { id: true },
        });
        if (!found) return candidate;
        attempt += 1;
        // Defensive cap to avoid infinite loop
        if (attempt > 1000) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to allocate unique subdomain." });
        }
    }
}