const express = require('express');
const multer = require('multer');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const OpenAI = require('openai');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set');
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set');
  process.exit(1);
}

// Initialize Express
const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

// OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// MongoDB setup
const ResultsModel = require('./models/Results');

// Handle MongoDB connection
async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

// Handle MongoDB disconnection
mongoose.connection.on('disconnected', () => {
  console.log('❌ MongoDB disconnected. Attempting to reconnect...');
  connectToMongoDB();
});

// Initialize MongoDB connection
connectToMongoDB();

// Multer configuration for file uploads
const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('INVALID_FILE_TYPE'));
    } else {
      cb(null, true);
    }
  }
});

// Process image with OpenAI Vision API
async function processImageWithAI(imagePath) {
  try {
    // Validate and preprocess image
    const imageBuffer = await sharp(imagePath)
      .resize(800, 800, { fit: 'inside' })
      .normalize()
      .toBuffer();

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image. Describe all objects, animals (specify species if any), colors, and context. 
              If an animal is detected, respond with: "Animal Detected: [species]".`
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}` }
            }
          ]
        }
      ],
      max_tokens: 500
    });

    const analysis = response.choices[0].message.content;
    const isDog = analysis.includes('Animal Detected: dog');
    const isCat = analysis.includes('Animal Detected: cat');

    return {
      analysis,
      isAnimal: isDog || isCat,
      species: isDog ? 'dog' : isCat ? 'cat' : null,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('AI Processing Error:', error);
    throw new Error('AI_ANALYSIS_FAILED');
  }
}

// Upload route
app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ 
      success: false, 
      error: 'NO_FILE_UPLOADED' 
    });
  }

  try {
    const result = await processImageWithAI(req.file.path);

    // Save to MongoDB
    await ResultsModel.create({
      originalFilename: req.file.originalname,
      result,
      uploadDate: new Date()
    });

    // Cleanup
    await fs.unlink(req.file.path);

    res.json({ 
      success: true,
      analysis: result.analysis,
      isAnimal: result.isAnimal,
      species: result.species 
    });

  } catch (error) {
    // Cleanup on error
    if (req.file?.path) await fs.unlink(req.file.path).catch(console.error);

    res.status(500).json({ 
      success: false,
      error: error.message || 'SERVER_ERROR'
    });
  }
});

// Fetch results route
// Fetch results route
app.get('/results', async (req, res) => {
  try {
    const results = await ResultsModel.find().sort({ uploadDate: -1 }).limit(50);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'DB_FETCH_FAILED' 
    });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Handle server shutdown gracefully
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  try {
    await mongoose.connection.close();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});
