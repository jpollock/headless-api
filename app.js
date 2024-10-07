import express from 'express';
import axios from 'axios';

const app = express();
const port = 3000;
const REMOTE_API_BASE_URL = 'https://api.wordpress.org'; // Replace with your actual backend URL

app.use(express.json());

// Proxy all requests to the remote backend
app.all('/*', async (req, res) => {
  try {
    const backendUrl = `${REMOTE_API_BASE_URL}${req.path}`;
    
    const backendResponse = await axios({
      method: req.method,
      url: backendUrl,
      data: req.body,
      headers: {
        ...req.headers,
        host: new URL(REMOTE_API_BASE_URL).host
      },
      params: req.query, // Forward query parameters
    });

    // Forward the response status, headers, and body
    res.status(backendResponse.status);
    
    // Forward relevant headers
    const headersToForward = ['content-type', 'cache-control', 'expires', 'pragma'];
    headersToForward.forEach(header => {
      if (backendResponse.headers[header]) {
        res.setHeader(header, backendResponse.headers[header]);
      }
    });

    res.send(backendResponse.data);
  } catch (error) {
    console.error('Error proxying request:', error.message);
    
    // Forward error status and message if available
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});