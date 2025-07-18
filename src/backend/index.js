const express = require('express');
const cors = require('cors');
const path = require('path');
const promClient = require('prom-client');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000

//middleware
app.use(cors());
app.use(express.json());

// Prometheus metrics setup
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics();

const requestCounter = new promClient.Counter({
    name: 'http_request_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status']
});

// Middleware to count requests
app.use((req, res, next) => {
    requestCounter.inc({ method: req.method, route: req.path, status: res.statusCode });
    next();
})

// Routes
app.get('/api/greeting', (req, res) => {
    res.json({ message: "Hello from backend!" });
});

app.get('/health', (req, res) => {
    res.json({ status: "UP" });
});

app.get('/readiness', (req, res) => {
    res.json({ ready: true });
});

app.get('/devsecops-info', (req, res) => {
    res.json({
        appName: process.env.APP_NAME,
        environment: process.env.NODE_ENV || 'development',
        build: {
            commitId: process.env.COMMIT_ID || 'unknown',
            buildTime: process.env.BUILD_TIME || new Date().toISOString(),
            ciSystem: 'Jenkins',
        },
        securityScans: {
            trivy: {
                lastRun: process.env.TRIVY_LAST_RUN || null,
                vulnerabilitiesFound: Number(process.env.TRIVY_VULNS || 0),
                status: process.env.TRIVY_STATUS || 'unknown'
            },
            sonarqube: {
                lastRun: process.env.SONAR_LAST_RUN || null,
                qualityGate: process.env.SONAR_GATE || 'unknown'
            },
            zap: {
                lastRun: process.env.ZAP_LAST_RUN || null,
                alerts: Number(process.env.ZAP_ALERTS || 0),
                status: process.env.ZAP_STATUS || 'not available'
            }
        },
        monitoring: {
            prometheusEndpoint: '/metrics',
            grafanaDashboards: [
                'http://localhost:3001'
            ]
        },
        swaggerDocs: '/swagger'
    });
});


// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
});

app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
    console.log(`Backend running from http://localhost:${port}`)
});