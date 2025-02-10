const express = require('express');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yaml');
const fs = require('fs');

const app = express();
const port = 3000;

// Laeb OpenAPI spetsifikatsiooni YAML formaadis
const openapiDocument = yaml.parse(fs.readFileSync('./openapi.yaml', 'utf8'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

app.listen(port, () => {
    console.log(`Swagger UI available at http://localhost:${port}/api-docs`);
});
