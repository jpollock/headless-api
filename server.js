import app from './src/app.js';
import config from './src/config/index.js';

const port = config.port || 3000;
const host = 'localhost'; // This will make it listen on all available network interfaces

app.listen(port, host, () => {
  console.log(`Server running on http://${host}:${port}`);
});