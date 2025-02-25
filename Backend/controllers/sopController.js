// sopController.js
const SOP = require('../models/SOP');
const OpenAI = require('openai').default;
const fs = require('fs');

// OpenAI Configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY // This is also the default, can be omitted
  });

// Process an uploaded SOP
const processSOP = async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'File is required' });
  }

  try {
    // Save SOP entry to the database
    const sop = await SOP.create({
      user: req.user.id,
      filePath: file.path,
      status: 'Processing',
    });

    // Read and process the file asynchronously
    const fileContent = fs.readFileSync(file.path, 'utf8');
    const aiResponse = await openai.chat.completions.create({
      model: 'GPT-4o-mini',
      prompt: `Extract and summarize the following SOP document:\n\n${fileContent}`,
      max_tokens: 1000,
    });

    // Update the SOP entry with results
    sop.status = 'Complete';
    sop.result = aiResponse.data.choices[0].text.trim();
    await sop.save();

    res.status(201).json(sop);
  } catch (error) {
    console.error('Error processing SOP:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get a specific SOP
const getSOP = async (req, res) => {
  try {
    const sop = await SOP.findById(req.params.id);

    if (!sop) {
      return res.status(404).json({ error: 'SOP not found' });
    }

    if (sop.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.status(200).json(sop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all SOPs for the logged-in user
const getAllSOPs = async (req, res) => {
  try {
    const sops = await SOP.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(sops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  processSOP,
  getSOP,
  getAllSOPs,
};