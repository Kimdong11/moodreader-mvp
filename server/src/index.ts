import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('MoodReader Proxy API: Hello World');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
