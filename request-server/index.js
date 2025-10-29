const express = require('express')
const httpProxy = require('http-proxy')
const { Pool } = require('pg');
require("dotenv").config();

const app = express()
const PORT = 8000
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const BASE_PATH = 'https://storage.googleapis.com/cloudeploy_assets/__outputs'

const proxy = httpProxy.createProxy()
console.log(process.env.DATABASE_URL);
app.use(async (req, res) => {
    const hostname = req.hostname;
    const subdomain = hostname.split('.')[0];
    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT id FROM "Project" WHERE subdomain = $1', [subdomain]);
        const project = rows[0]?.id || subdomain;
        const resolvesTo = `${BASE_PATH}/${project}`;
        return proxy.web(req, res, { target: resolvesTo, changeOrigin: true })
    } finally {
        client.release();
    }

})

proxy.on('proxyReq', (proxyReq, req, res) => {
    const url = req.url;
    if (url === '/')
        proxyReq.path += 'index.html'
});

app.listen(PORT);