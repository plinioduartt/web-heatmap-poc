import express from 'express';
import eventsRouter from './routes/events';
import bodyParser from 'body-parser';

const app = express();

app.use(bodyParser.json());
app.use('/api', eventsRouter);

export default app;
