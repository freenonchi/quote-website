require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // Add connect-mongo for session storage
const mongoose = require('mongoose'); // MongoDB client
const path = require('path'); // For handling file paths
const app = express();
const port = 3000;

// Hardcoded users (manually added by admin)
const users = [
  { username: 'admin', password: 'admin123' } // Add more users here if needed
];

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define the Quote schema
const quoteSchema = new mongoose.Schema({
  text: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  author: { type: String, required: true }
});

// Create the Quote model
const Quote = mongoose.model('Quote', quoteSchema);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key', // Use the secret key from .env
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ // Use connect-mongo for session storage
    mongoUrl: MONGODB_URI,
    collectionName: 'sessions' // Optional: Name of the collection to store sessions
  }),
  cookie: { secure: false } // Set to true if using HTTPS
}));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'views/public'))); // Serve static files from views/public

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next(); // User is logged in, proceed
  } else {
    res.redirect('/login'); // Redirect to login page
  }
};

// Routes
app.get('/', async (req, res) => {
  try {
    console.log('Fetching quotes from the database...');
    const quotes = await Quote.find({});
    console.log('Quotes fetched successfully:', quotes);
    res.render('index', { quotes, user: req.session.user });
  } catch (err) {
    console.error('Error fetching quotes:', err);
    res.status(500).send('Error fetching quotes');
  }
});

app.get('/new-quote', isAuthenticated, (req, res) => {
  console.log('Rendering new-quote page...');
  res.render('new-quote');
});

app.post('/save-quote', isAuthenticated, async (req, res) => {
  try {
    console.log('Saving a new quote...');
    const { text, author } = req.body;

    // Create a new quote with the provided text and author
    const newQuote = new Quote({
      text,
      author,
      tags: 'N/A' // Default tags to 'N/A' for now
    });

    // Save the new quote to the database
    await newQuote.save();
    console.log('Quote saved successfully');

    // Redirect to the homepage
    res.redirect('/');
  } catch (err) {
    console.error('Error saving quote:', err);
    res.status(500).send('Error saving quote');
  }
});

app.post('/delete-quote/:id', isAuthenticated, async (req, res) => {
  try {
    console.log('Deleting quote with ID:', req.params.id);
    const quoteId = req.params.id;
    await Quote.findByIdAndDelete(quoteId);
    console.log('Quote deleted successfully');
    res.redirect('/');
  } catch (err) {
    console.error('Error deleting quote:', err);
    res.status(500).send('Error deleting quote');
  }
});

// Login routes
app.get('/login', (req, res) => {
  console.log('Rendering login page...');
  if (req.session.user) {
    res.redirect('/'); // Redirect to homepage if already logged in
  } else {
    res.render('login', { error: null });
  }
});

app.post('/login', (req, res) => {
  console.log('Processing login request...');
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    console.log('Login successful for user:', user.username);
    req.session.user = user; // Store user in session
    res.redirect('/'); // Redirect to homepage after successful login
  } else {
    console.log('Login failed for username:', username);
    res.render('login', { error: 'Invalid username or password' });
  }
});

// Logout route
app.get('/logout', (req, res) => {
  console.log('Logging out user...');
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Error logging out');
    }
    console.log('User logged out successfully');
    res.redirect('/'); // Redirect to homepage after logout
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});