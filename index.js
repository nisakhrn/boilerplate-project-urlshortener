require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dns = require('dns');
const { URL } = require('url');

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// In-memory storage for URLs to avoid dependency on MongoDB for testing
const urlDatabase = [];

// Create counter for short URLs
let counter = 0;

// Use middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/public', express.static(`${process.cwd()}/public`));

// Root route
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// URL validation function
function isValidUrl(url) {
  try {
    const newUrl = new URL(url);
    return newUrl.protocol === 'http:' || newUrl.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

// Endpoint to create a shortened URL
app.post('/api/shorturl', function(req, res) {
  const url = req.body.url;
  
  // Check if the URL is valid format
  if (!isValidUrl(url)) {
    return res.json({ error: 'invalid url' });
  }
  
  // Parse the hostname from the URL
  try {
    const urlObject = new URL(url);
    const hostname = urlObject.hostname;
    
    // Use dns.lookup to verify the URL
    dns.lookup(hostname, (err) => {
      if (err) {
        return res.json({ error: 'invalid url' });
      }
      
      // Check if URL already exists in the database
      const existingUrl = urlDatabase.find(item => item.original_url === url);
      
      if (existingUrl) {
        return res.json({
          original_url: existingUrl.original_url,
          short_url: existingUrl.short_url
        });
      }
      
      // If not, create a new entry
      counter++;
      const newUrl = {
        original_url: url,
        short_url: counter
      };
      
      urlDatabase.push(newUrl);
      
      return res.json({
        original_url: newUrl.original_url,
        short_url: newUrl.short_url
      });
    });
  } catch (error) {
    console.error(error);
    return res.json({ error: 'invalid url' });
  }
});

// Endpoint to redirect to the original URL
app.get('/api/shorturl/:short_url', function(req, res) {
  const short_url = parseInt(req.params.short_url);
  
  // Find the URL in the database
  const urlData = urlDatabase.find(item => item.short_url === short_url);
  
  if (!urlData) {
    return res.json({ error: 'No short URL found for the given input' });
  }
  
  // Redirect to the original URL
  return res.redirect(urlData.original_url);
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});