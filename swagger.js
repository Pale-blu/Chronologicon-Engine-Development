// swagger.js
const swaggerJSDoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Chronologicon API',
            version: '1.0.0',
            description: 'API documentation for Chronologicon event ingestion & insights'
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Local dev server'
            }
        ]
    },
    apis: ['./routes/*.js']  // 👈 Make sure this path is correct!
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
