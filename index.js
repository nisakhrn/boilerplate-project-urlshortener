require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dns = require('dns');
const { URL } = require('url');

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/urlshortener', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Create URL Schema and Model
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});

const UrlModel = mongoose.model('Url', urlSchema);

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
  const { url } = req.body;
  
  // Check if the URL is valid
  if (!isValidUrl(url)) {
    return res.json({ error: 'invalid url' });
  }
  
  try {
    // Parse the hostname from the URL
    const urlObject = new URL(url);
    const hostname = urlObject.hostname;
    
    // Use dns.lookup to verify the URL
    dns.lookup(hostname, async (err) => {
      if (err) {
        return res.json({ error: 'invalid url' });
      }
      
      // Check if URL already exists in the database
      let urlDoc = await UrlModel.findOne({ original_url: url });
      
      if (!urlDoc) {
        // If not, create a new entry
        const count = await UrlModel.countDocuments({});
        const short_url = count + 1;
        
        urlDoc = new UrlModel({
          original_url: url,
          short_url: short_url
        });
        
        await urlDoc.save();
      }
      
      res.json({
        original_url: urlDoc.original_url,
        short_url: urlDoc.short_url
      });
    });
  } catch (error) {
    console.error(error);
    res.json({ error: 'invalid url' });
  }
});

// Endpoint to redirect to the original URL
app.get('/api/shorturl/:short_url', async function(req, res) {
  const short_url = parseInt(req.params.short_url);
  
  try {
    const urlDoc = await UrlModel.findOne({ short_url: short_url });
    
    if (!urlDoc) {
      return res.json({ error: 'No short URL found for the given input' });
    }
    
    res.redirect(urlDoc.original_url);
  } catch (error) {
    console.error(error);
    res.json({ error: 'Server error' });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});