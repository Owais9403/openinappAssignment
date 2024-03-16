// Import required modules
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cron = require('node-cron');
const Task = require('./model/Task');
const SubTask = require('./model/SubTask');
const User = require('./model/user');
const app = express();
const Twilio = require('twilio');
// MongoDB connection
mongoose.connect('mongodb+srv://vishwa:vishwa@cluster0.ot5sq.mongodb.net/assignmnt', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  
});
const twilioClient = new Twilio("ACf64b64a5ceb472e0786e3217c76b252e", "38843265fb60c9c840e59f0f1d02774a");

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, "38843265fb60c9c840e59f0f1d02774a", (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// API routes

// Create Task
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    // Validate input
    const { title, description, due_date } = req.body;
    if (!title || !description || !due_date) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Create task
    const task = new Task({
      title,
      description,
      due_date,
      user_id: req.user.id,
    });
    await task.save();
    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create Sub Task
app.post('/api/subtasks/:taskId', authenticateToken, async (req, res) => {
  try {
    // Validate input
    const { status } = req.body;
    if (status === undefined || !Number.isInteger(status) || status < 0 || status > 1) {
      return res.status(400).json({ error: 'Invalid status for subtask' });
    }

    // Check if task exists
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Create subtask
    const subtask = new SubTask({
      task_id: task._id,
      status,
    });
    await subtask.save();
    res.status(201).json({ message: 'Subtask created successfully', subtask });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all user tasks
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    // Pagination parameters
    let { page = 1, limit = 10, priority, due_date } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    // Filtering based on priority and due_date
    const filter = { user_id: req.user.id };
    if (priority) filter.priority = priority;
    if (due_date) filter.due_date = due_date;

    // Fetch tasks with pagination
    const tasks = await Task.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ due_date: 'asc' });
    res.status(200).json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all user subtasks
app.get('/api/subtasks', authenticateToken, async (req, res) => {
  try {
    const { task_id } = req.query;
    const filter = { user_id: req.user.id };
    if (task_id) filter.task_id = task_id;

    const subtasks = await SubTask.find(filter);
    res.status(200).json(subtasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update Task
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { due_date, status } = req.body;
    const updates = {};
    if (due_date) updates.due_date = due_date;
    if (status) updates.status = status;

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      updates,
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update corresponding subtasks
    await SubTask.updateMany({ task_id: task._id }, { status });

    res.status(200).json({ message: 'Task updated successfully', task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update Sub Task
app.put('/api/subtasks/:id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (status === undefined || !Number.isInteger(status) || status < 0 || status > 1) {
      return res.status(400).json({ error: 'Invalid status for subtask' });
    }

    const subtask = await SubTask.findOneAndUpdate(
      { _id: req.params.id },
      { status },
      { new: true }
    );

    if (!subtask) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    res.status(200).json({ message: 'Subtask updated successfully', subtask });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Soft Delete Task
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { deleted_at: Date.now() },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Soft delete corresponding subtasks
    await SubTask.updateMany({ task_id: task._id }, { deleted_at: Date.now() });

    res.status(200).json({ message: 'Task deleted successfully', task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Soft Delete Sub Task
app.delete('/api/subtasks/:id', authenticateToken, async (req, res) => {
  try {
    const subtask = await SubTask.findOneAndUpdate(
      { _id: req.params.id },
      { deleted_at: Date.now() },
      { new: true }
    );

    if (!subtask) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    res.status(200).json({ message: 'Subtask deleted successfully', subtask });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.post('/api/create',  async (req, res) => {
  try{
const { phone_number, priority } = req.body;
if(!phone_number ){
  return res.status(404).json({ error: 'Phone Number or Priority required' });
}
if(phone_number.toString().length!=10){
  return res.status(404).json({ error: 'Phone Number Should be 10 digits' });

}
const userFind = await User.find({phone_number})
console.log(userFind)
// if(userFind){
//     throw new CustomError("Phone Number is already been used", 400);
// }
const userAccount = await User.create({phone_number,priority})
   res.status(200).json({
     success: true,
     userAccount
   });
  
  
}  catch (error) {
  console.error(error);
  res.status(500).json({ error: 'Internal Server Error' });
}} 
)



//  let updatePriority =  cron.schedule('*/1 * * * *', async () => {
//   try {
//     console.log("-----  update-job running   ----- ")
//     // Update tasks based on due_date
//     await Task.updateMany(
//       { due_date: { $eq: new Date() } },
//       { $set: { priority: 0 } }
//     );
//     await Task.updateMany(
//       { due_date: { $gte: new Date(), $lte: new Date(new Date().setDate(new Date().getDate() + 2)) } },
//       { $set: { priority: 1 } }
//     );
//     await Task.updateMany(
//       { due_date: { $gte: new Date(new Date().setDate(new Date().getDate() + 3)) } },
//       { $set: { priority: 2 } }
//     );

//   } catch (error) {
//     console.error('Error updating task priorities:', error);
//   }
// }
// );

// const callingUser =  cron.schedule('*/1 * * * *', async () => {
//   try {
//     const users = await User.find({ priority: 0 });
//     for (const user of users) {
//       console.log(" -----     running calling feature in cron job    ----- ")
//       const overdueTasks = await Task.find({ user_id: user.id, due_date: { $lt: new Date() } });
//       if (overdueTasks.length > 0) {
//         await twilioClient.calls.create({
//           twiml: '<Response><Say>Your task is overdue. Please check your task list.</Say></Response>',
//           to: "+919652469354",
//           from: '+15715816559'
//         });
//         break;
//       }
//     }
//   } catch (error) {
//     console.error('Error making Twilio calls:', error);
//   }
// });


// module.exports = {
//   updatePriority,
//   callingUser
// };

// Start server
const PORT =  4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});