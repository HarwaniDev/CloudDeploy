const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const { Storage } = require('@google-cloud/storage');
// const Redis = require('ioredis')

// const publisher = new Redis('')

// Initialize client
const storage = new Storage({
    projectId: process.env.projectId,
});
const bucket = storage.bucket('cloudeploy_assets');
const PROJECT_ID = process.env.PROJECT_ID;

// function publishLog(log) {
//     publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify({ log }))
// }

async function pushToStorage() {
    console.log('Build Complete');
    // publishLog(`Build Complete`);
    const distFolderPath = path.join(__dirname, 'output', 'dist');
    const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true });

    // publishLog(`Starting to upload`)
    for (const file of distFolderContents) {
        const filePath = path.join(distFolderPath, file)
        if (fs.lstatSync(filePath).isDirectory()) continue;

        console.log('uploading', filePath);
        // publishLog(`uploading ${file}`)
        try {
            await bucket.upload(filePath, {
                destination: `__outputs/${PROJECT_ID}/${file}`,
                metadata: {
                    contentType: mime.lookup(filePath)
                }
            });
            // publishLog(`uploaded ${file}`)
            console.log('uploaded', filePath);
        } catch (error) {
            console.error(error);
            console.error("error uploading file: ", filePath);
        }
    }
    // publishLog(`Done`)
    console.log('Done...')
}

async function init() {
    console.log('Executing script.js')
    // publishLog('Build Started...')
    const outDirPath = path.join(__dirname, 'output');

    const p = exec(`cd ${outDirPath} && npm install && npm run build`);

    p.stdout.on('data', function (data) {
        console.log(data.toString())
        // publishLog(data.toString())
    });

    p.stdout.on('error', function (data) {
        console.log('Error', data.toString())
        // publishLog(`error: ${data.toString()}`)
    });

    p.on('close', () => {
        pushToStorage();
    });
}

init();