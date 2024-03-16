const mongoose = require('mongoose');

const subTaskSchema = new mongoose.Schema({
  task_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  status: {
    type: Number,
    enum: [0, 1],
    default: 0
  },
  updated_at: {
    type: Date,
    default: null
  },
  created_at:{
    type:Date,
    default:null,
  },
  deleted_at:{
    type:Date,
    default:null
  }
}, 
// { timestamps: true }

);
module.exports = mongoose.model('SubTask', subTaskSchema);