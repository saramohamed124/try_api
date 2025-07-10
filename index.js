const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB!'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

const userSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const taskSchema = new mongoose.Schema({
  task_name: { type: String, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);

app.post('/signup', async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists.' });
    }

    const newUser = new User({
      first_name,
      last_name,
      email,
      password,
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully!', userId: newUser._id });
  } catch (err) {
    console.error('Error in signup endpoint:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and Password are Required.' });
    }

    const user = await User.findOne({ email, password });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    res.status(200).json({
      message: 'Login Succeeded!',
      user: {
        id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Error in login endpoint:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/tasks', async (req, res) => {
  try {
    const { task_name, user_id, status } = req.body;

    if (!task_name || !user_id) {
      return res.status(400).json({ message: 'Task name and user ID are required.' });
    }

    const existingUser = await User.findById(user_id);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found. Invalid user_id.' });
    }

    const newTask = new Task({
      task_name,
      user_id,
      status: status || 'pending',
    });

    await newTask.save();

    res.status(201).json({ message: 'Task created successfully!', taskId: newTask._id });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ message: 'An error occurred while creating the task.' });
  }
});

app.get('/tasks', async (req, res) => {
  try {
    const userId = req.query.user_id;
    let tasks;

    if (userId) {
      tasks = await Task.find({ user_id: userId });
    } else {
      tasks = await Task.find({});
    }

    res.status(200).json({ tasks });
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ message: 'An error occurred while fetching tasks.' });
  }
});

app.patch('/tasks/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const { status, user_id } = req.body;

    if (!status || !user_id) {
      return res.status(400).json({ message: 'Status and user ID are required for update.' });
    }

    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, user_id: user_id },
      { status: status },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found or you do not have permission to update this task.' });
    }

    res.status(200).json({ message: 'Task status updated successfully!', task: updatedTask });
  } catch (err) {
    console.error('Error updating task status:', err);
    res.status(500).json({ message: 'An error occurred while updating the task status.' });
  }
});

app.delete('/tasks/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: 'User ID is required to delete a task.' });
    }

    const deletedTask = await Task.findOneAndDelete({ _id: taskId, user_id: user_id });

    if (!deletedTask) {
      return res.status(404).json({ message: 'Task not found or you do not have permission to delete this task.' });
    }

    res.status(200).json({ message: 'Task deleted successfully!' });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ message: 'An error occurred while deleting the task.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});