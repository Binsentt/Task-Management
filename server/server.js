import express from 'express'
import connectDatabase from './config/database.js';

const app = express();
const port = 8080;

app.use(express.json());

connectDatabase();

app.get('/', (req, res) => {
  res.send(`port is running at ${port}`)
});

app.listen(port, () => {
  console.log(`port running at ${port}`)
});






