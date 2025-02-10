const express = require('express');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');
const path = require('path');

const app = express();
const port = 3000;

// Laeb YAML-faili
const openapiDocument = yaml.load(path.join(__dirname, 'openapi.yaml'));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

// Start
app.listen(port, () => {
    console.log(`Swagger UI running at http://localhost:${port}/api-docs`);
});
