// triggerJob.js
import { JobsClient } from '@google-cloud/run';
import { GoogleAuth } from 'google-auth-library';
import { getServerCaller } from '~/server/api/root';
const client = new JobsClient();
export async function triggerJob(requestHeaders: Readonly<Headers>, deploymentId: string, PROJECT_ID: string, GIT_REPOSITORY__URL: string) {
    // Full resource name for the job
    const name = `projects/cloudeploy-474007/locations/asia-south1/jobs/build-server`;

    try {
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
                            { name: "GIT_REPOSITORY__URL", value: GIT_REPOSITORY__URL }
                        ]
                    }
                ]
            }
        });
        const caller = await getServerCaller(requestHeaders);
        await caller.project.updateDeployment({
            deploymentId: deploymentId,
            buildStatus: "BUILDING",
        });

        // Wait until the job execution finishes
        await operation.promise();

        // If successful, mark deployment as SUCCESS
        await caller.project.updateDeployment({
            deploymentId: deploymentId,
            buildStatus: "SUCCESS",
        });

    } catch (error: any) {
        const caller = await getServerCaller(requestHeaders);
        await caller.project.updateDeployment({
            deploymentId: deploymentId,
            buildStatus: "FAILED"
        });
        console.error('Error triggering job:', error.message);
    }
};
