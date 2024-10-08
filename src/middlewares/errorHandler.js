import config from '../config/index.js';

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log the error
  console.error('Error:', err);

  // Determine if we're in development mode
  const isDevelopment = config.devMode;

  // Set a default status code and message
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Check for specific error types and set appropriate status codes
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Bad Request';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Not Found';
  }

  // Prepare the error response
  const errorResponse = {
    error: {
      message: message,
      ...(isDevelopment && { stack: err.stack }) // Include stack trace in development mode
    }
  };

  // If in development mode, include more details about the error
  if (isDevelopment) {
    errorResponse.error.details = err.message;
  }

  // Send the error response
  res.status(statusCode).json(errorResponse);
};

export default errorHandler;