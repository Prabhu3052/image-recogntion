const Result = require('../models/Results');
const fs = require('fs');
const axios = require('axios');

const processImage = async (req, res) => {
  try {
    const image = fs.readFileSync(req.file.path, { encoding: 'base64' });

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions', 
      {
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "What's in this image?" },
              { type: "image", image: image }
            ]
          }
        ],
        max_tokens: 300
      }, 
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const resultText = response.data.choices[0].message.content;

    // Save in MongoDB
    const newResult = new Result({
      imageUrl: req.file.path,
      description: resultText
    });
    await newResult.save();

    res.json(newResult);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

const getResults = async (req, res) => {
  try {
    const results = await Result.find().sort({ createdAt: -1 });
    res.json(results);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

module.exports = { processImage, getResults };
