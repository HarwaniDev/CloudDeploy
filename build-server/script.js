const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const { Storage } = require('@google-cloud/storage');
const Redis = require('ioredis');

const publisher = new Redis(process.env.REDIS_URL);
const storage = new Storage({ projectId: process.env.projectId });
const bucket = storage.bucket('cloudeploy_assets');
const PROJECT_ID = process.env.PROJECT_ID;

let hadError = false; // <-- Track if any error occurred

function publishLog(log) {
  publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify({ log }));
}

async function pushToStorage() {
  console.log('Build Complete');
  publishLog('Build Complete');

  const distFolderPath = path.join(__dirname, 'output', 'dist');
  const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true });

  publishLog('Starting to upload');
  for (const file of distFolderContents) {
    const filePath = path.join(distFolderPath, file);
    if (fs.lstatSync(filePath).isDirectory()) continue;

    console.log('uploading', filePath);
    publishLog(`uploading ${file}`);
    try {
      await bucket.upload(filePath, {
        destination: `__outputs/${PROJECT_ID}/${file}`,
        metadata: { contentType: mime.lookup(filePath) },
      });
      publishLog(`uploaded ${file}`);
      console.log('uploaded', filePath);
    } catch (error) {
      hadError = true; // <-- Mark error
      console.error('Error uploading file:', filePath, error);
      publishLog(`error uploading ${file}: ${error.message}`);
    }
  }

  publishLog('Done');
  console.log('Done...');
}

async function init() {
  console.log('Executing script.js');
  publishLog('Build Started...');

  const outDirPath = path.join(__dirname, 'output');
  const p = exec(`cd ${outDirPath} && npm install && npm run build`);

  p.stdout.on('data', data => {
    const log = data.toString();
    console.log(log);
    publishLog(log);
  });

  p.stderr.on('data', data => {
    const log = data.toString();
    console.error('Error:', log);
    publishLog(`error: ${log}`);
    hadError = true; // <-- capture stderr as build error
  });

  p.on('close', async code => {
    console.log(`Build process exited with code ${code}`);
    if (code !== 0) {
      hadError = true; // <-- non-zero exit code means build failed
    }

    try {
      await pushToStorage();
    } catch (err) {
      hadError = true;
      console.error('Error during pushToStorage:', err);
      publishLog(`error during pushToStorage: ${err.message}`);
    }

    // Wait for Redis to finish sending logs
    await publisher.quit();

    if (hadError) {
      console.error('Exiting with error due to previous failures.');
      process.exit(1); // ❌ Mark job as failed
    } else {
      console.log('All done — exiting successfully.');
      process.exit(0); // ✅ Mark job as success
    }
  });
}

init();
