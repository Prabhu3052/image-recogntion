const mongoose = require('mongoose');

const ResultsSchema = new mongoose.Schema({
  originalFilename: String,
  result: {
    analysis: String,
    isAnimal: Boolean,
    species: String,
    timestamp: Date
  },
  uploadDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Results', ResultsSchema);