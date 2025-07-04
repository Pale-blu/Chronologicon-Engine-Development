const express = require('express');
const app = express();
const eventsRouter = require('./routes/events');
const bodyParser = require('body-parser');
const cors = require('cors');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api', eventsRouter);


app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
