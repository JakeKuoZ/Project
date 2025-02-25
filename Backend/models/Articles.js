// Article.js (Model)
const mongoose = require('mongoose');

const articleSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    htmlContent: {
      type: String,
      required: false,
    },
    files: {
      type: [String],
      required: false,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

articleSchema.index({ title: 'text', content: 'text' }); // Full-text search index

module.exports = mongoose.model('Article', articleSchema);