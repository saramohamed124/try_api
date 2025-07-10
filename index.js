const mysql = require('mysql');
const express = require('express');
const cors = require('cors');

const app = express(); 
const port = 3000; 

app.use(express.json());

app.use(cors());
require('dotenv').config();
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: '',
  database: process.env.DB_DATABASE 
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the database!');
});

// Auth


// SignUp
app.post('/signup', async (req, res) => {
  try{
const { first_name, last_name, email, password } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const sql = `INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)`;
  connection.query(sql, [first_name, last_name, email, password], (err, result) => {
    if (err) {
      console.error('Error registering user:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Email already exists.' });
      }
      return res.status(500).json({ message: 'Error registering user.' });
    }
    res.status(201).json({ message: 'User registered successfully!', userId: result.insertId });
  });}
  catch(err) {
    res.status(500).json({ message:'internal server Error'})
  }
});

// Login

app.post('/login', async (req, res) => { // 'res' here is the Express response object
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and Password are Required.' });
    }

    const sql = `SELECT * FROM users WHERE email = ? AND password = ?`;
    connection.query(sql, [email, password], (err, rows) => { // <--- CORRECTED LINE
      if (err) {
        console.error('Error during login:', err);
        return res.status(500).json({ message: 'An error occurred during login.' });
      }

      // 'rows' now correctly holds the query results
      if (rows.length === 0) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const user = rows[0]; // Accessing the first row of results
      
      // Using the Express 'res' object from the outer scope to send the response
      res.status(200).json({
        message: 'Login Succeeded!', // Corrected typo here, too
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email
        }
      });
    });
  } catch (err) {
    // This catch block handles errors *before* the connection.query callback.
    // E.g., if there's an issue with req.body parsing.
    console.error('Unexpected error in login endpoint:', err); // Log the actual error
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Tasks
app.post('/tasks', (req, res) => {
  const { task_name, user_id, status } = req.body; // These names match your DB columns

  if (!task_name || !user_id) {
    return res.status(400).json({ message: 'Task name and user ID are required.' });
  }

  const sql = `INSERT INTO tasks (task_name, user_id, status) VALUES (?, ?, ?)`;
  
  connection.query(sql, [task_name, user_id, status], (err, result) => {
    if (err) {
      console.error('Error creating task:', err);
      if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
          return res.status(404).json({ message: 'User not found for this task. Invalid user_id.' });
      }
      return res.status(500).json({ message: 'An error occurred while creating the task.' });
    }
    res.status(201).json({ message: 'Task created successfully!', taskId: result.insertId });
  });
});

app.get('/tasks', (req, res) => {
  const userId = req.query.user_id; // Retrieves user_id from the URL query string

  let sql = `SELECT * FROM tasks`; // Base query to get all tasks
  let params = []; // Array for SQL parameters

  if (userId) {
    sql += ` WHERE user_id = ?`;
    params.push(userId); 
  }

  connection.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching tasks:', err);
      return res.status(500).json({ message: 'An error occurred while fetching tasks.' });
    }
    res.status(200).json({ tasks: results }); // Send the fetched tasks back in the response
  });
});

app.delete('/tasks/:id', (req, res) => {

})
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

