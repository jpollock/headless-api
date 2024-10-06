import express from 'express';

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Simple GET route
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

// Simple POST route
app.post('/api/echo', (req, res) => {
  res.json({ message: `You sent: ${JSON.stringify(req.body)}` });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});