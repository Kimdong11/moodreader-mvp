import express from 'express';
import cors from 'cors';
import { analyzeHandler } from './analyze';
import { eventsHandler } from './events';
import { Logger } from './policy/logging';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.send('MoodReader API Proxy v1');
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises
app.post('/v1/analyze', analyzeHandler);
app.post('/v1/events', eventsHandler);

app.listen(PORT, () => {
  Logger.info(`Server running on port ${PORT}`);
});
