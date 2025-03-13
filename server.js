require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose(); // SQLite client
const app = express();
const port = 3000;

// Hardcoded users (manually added by admin)
const users = [
  { username: 'admin', password: 'admin123' } // Add more users here if needed
];

// Set up SQLite database
const db = new sqlite3.Database('./quotes.db');

// Create quotes table if it doesn't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      author TEXT NOT NULL
    )
  `);
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key', // Use the secret key from .env
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next(); // User is logged in, proceed
  } else {
    res.redirect('/login'); // Redirect to login page
  }
};

// Routes
app.get('/', (req, res) => {
  console.log('Fetching quotes from the database...');
  db.all('SELECT * FROM quotes', (err, quotes) => {
    if (err) {
      console.error('Error fetching quotes:', err);
      return res.status(500).send('Error fetching quotes');
    }
    console.log('Quotes fetched successfully:', quotes);
    res.render('index', { quotes, user: req.session.user });
  });
});

app.get('/new-quote', isAuthenticated, (req, res) => {
  console.log('Rendering new-quote page...');
  res.render('new-quote');
});

app.post('/save-quote', isAuthenticated, (req, res) => {
  console.log('Saving a new quote...');
  const { text, date, time, author, unknownDate, unknownTime } = req.body;

  const finalDate = unknownDate === 'on' ? 'Unknown' : date;
  const finalTime = unknownTime === 'on' ? 'Unknown' : time;

  db.run(
    'INSERT INTO quotes (text, date, time, author) VALUES (?, ?, ?, ?)',
    [text, finalDate, finalTime, author],
    (err) => {
      if (err) {
        console.error('Error saving quote:', err);
        return res.status(500).send('Error saving quote');
      }
      console.log('Quote saved successfully');
      res.redirect('/');
    }
  );
});

app.post('/delete-quote/:id', isAuthenticated, (req, res) => {
  console.log('Deleting quote with ID:', req.params.id);
  const quoteId = req.params.id;

  db.run('DELETE FROM quotes WHERE id = ?', [quoteId], (err) => {
    if (err) {
      console.error('Error deleting quote:', err);
      return res.status(500).send('Error deleting quote');
    }
    console.log('Quote deleted successfully');
    res.redirect('/');
  });
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