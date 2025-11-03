// triggerJob.js
import { JobsClient } from '@google-cloud/run';
import { GoogleAuth } from 'google-auth-library';
import { getServerCaller } from '~/server/api/root';
import Redis from "ioredis";
import { TRPCError } from '@trpc/server';

const client = new JobsClient();
// TODO:- process.env.REDIS_URL is not working. Look into it
const subscriber = new Redis("rediss://default:AXrpAAIncDIzN2QyNTBkM2QwNDE0MWNlYmExNzViMGYxNTdmMTYxZnAyMzE0NjU@distinct-clam-31465.upstash.io:6379");

export async function triggerJob(requestHeaders: Readonly<Headers>, deploymentId: string, PROJECT_ID: string, GIT_REPOSITORY__URL: string) {
    // Full resource name for the job
    const name = `projects/cloudeploy-474007/locations/asia-south1/jobs/build-server`;
    const caller = await getServerCaller(requestHeaders);
    const logs: { message: string }[] = [];

    try {
        subscriber.psubscribe(`logs:${PROJECT_ID}`)
        console.log(`Triggering Cloud Run job: build-server...`);

        // Execute the job and wait for completion
        const [operation] = await client.runJob({
            name,
            overrides: {
                containerOverrides: [
                    {
                        env: [
                            { name: "PROJECT_ID", value: PROJECT_ID },
                            { name: "projectId", value: "cloudeploy-474007" },
                            { name: "GIT_REPOSITORY__URL", value: GIT_REPOSITORY__URL },
                            { name: "REDIS_URL", value: process.env.REDIS_URL }
                        ]
                    }
                ]
            }
        });
        await caller.project.updateDeployment({
            deploymentId: deploymentId,
            buildStatus: "BUILDING",
        });
        subscriber.on("pmessage", (pattern, channel, message) => {
            try {
                const parsed = JSON.parse(message);
                if (parsed && typeof parsed.log === "string") {
                    logs.push({ message: parsed.log });
                }
            } catch (err) {
                console.error("Failed to parse log message from Redis:", err, message);
            }
        });

        // Wait until the job execution finishes
        await operation.promise();

        await caller.project.updateDeployment({
            deploymentId: deploymentId,
            buildStatus: "SUCCESS",
        });
    } catch (error: any) {
        await caller.project.updateDeployment({
            deploymentId: deploymentId,
            buildStatus: "FAILED"
        });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Error triggering job: ${error.message}` });
    } finally {
        // Store logs in finally to ensure they're saved even if an error occurs
        // Don't throw here to avoid masking the original error
        try {
            if (logs.length > 0) {
                await caller.project.addLogs({
                    projectId: PROJECT_ID,
                    logs: logs
                });
            }
        } catch (error) {
            // Log the error but don't throw - we don't want to mask the original error
            console.error("Failed to store logs:", error);
        }
    }
};
