const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chatSchema = new Schema(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now
    },
    // you can store other metadata if needed
  },
  { timestamps: true }
);

module.exports = mongoose.model('Chat', chatSchema);