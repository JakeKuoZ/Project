// Import necessary modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const path = require('path');
const { protect } = require('./middleware/authMiddleware');



// Load environment variables
dotenv.config();

// Initialize the Express app
const app = express();
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Middleware
app.use(express.json());
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));


// // Disable ETag, so the server never responds 304
// app.disable('etag');

// // Or force no-cache
// app.use((req, res, next) => {
//   res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
//   res.setHeader('Pragma', 'no-cache');
//   res.setHeader('Expires', '0');
//   next();
// });

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {});
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};
connectDB();

// Routes Placeholder
// Authentication routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

// Knowledge Base routes
app.use('/api/articles', require('./routes/articleRoutes'));

// Ticketing System routes
app.use('/api/tickets', require('./routes/ticketRoutes'));

// Real-Time Chat routes
app.use('/api/chat', require('./routes/chatRoutes'));

// AI Analysis routes
app.use('/api/sop', require('./routes/sopRoutes'));

app.use('/api/dashboard', protect, require('./routes/dashboardRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
// Utility to get all routes
function getRoutes(app) {
  const routes = [];
  app._router.stack.forEach((middleware) => {
      if (middleware.route) {
          // Routes registered directly on the app
          const { path, methods } = middleware.route;
          routes.push({ path, methods: Object.keys(methods) });
      } else if (middleware.name === 'router') {
          // Routes added via a router
          middleware.handle.stack.forEach((nestedMiddleware) => {
              if (nestedMiddleware.route) {
                  const { path, methods } = nestedMiddleware.route;
                  routes.push({ path, methods: Object.keys(methods) });
              }
          });
      }
  });
  return routes;
}

// Endpoint to view all routes
app.get('/routes', (req, res) => {
  const routes = getRoutes(app);
  res.json(routes);
});

// File Structure
// - routes
//   - authRoutes.js
//   - articleRoutes.js
//   - ticketRoutes.js
//   - chatRoutes.js
//   - analysisRoutes.js
// - models
//   - User.js
//   - Article.js
//   - Ticket.js
//   - ChatMessage.js
// - controllers
//   - authController.js
//   - articleController.js
//   - ticketController.js
//   - chatController.js
//   - analysisController.js
// - utils
//   - validateInput.js
// - middleware
//   - authMiddleware.js
// - .env
// - server.js
