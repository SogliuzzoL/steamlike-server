// steamlike-backend/index.js

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-secret-key';

app.use(cors());
app.use(express.json());
app.use('/games', express.static('games'));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/steamlike', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Schemas
const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
});

const GameSchema = new mongoose.Schema({
  name: String,
  version: String,
  filePath: String,
  coverUrl: String
});

const User = mongoose.model('User', UserSchema);
const Game = mongoose.model('Game', GameSchema);

// Auth Middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.sendStatus(403);
  }
}

// Admin Middleware
function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin') return res.sendStatus(403);
  next();
}

// Register (always creates a user)
app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hash });
  await user.save();
  res.sendStatus(201);
});

// Login
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) return res.sendStatus(401);
  const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET);
  res.json({ token });
});

// Promote user to admin (Admin only)
app.post('/auth/promote', authMiddleware, adminMiddleware, async (req, res) => {
  const { username } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.role = 'admin';
  await user.save();
  res.json({ message: `${username} is now an admin.` });
});

// Demote admin to user (Admin only)
app.post('/auth/demote', authMiddleware, adminMiddleware, async (req, res) => {
  const { username } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.role = 'user';
  await user.save();
  res.json({ message: `${username} is now a user.` });
});

// Get Games
app.get('/games', authMiddleware, async (req, res) => {
  const games = await Game.find();
  res.json(games);
});

// Upload game (Admin only)
const upload = multer({ dest: 'games/' });
app.post('/games/upload', authMiddleware, adminMiddleware, upload.single('game'), async (req, res) => {
  const { name, version } = req.body;
  const filePath = req.file.path;
  const game = new Game({ name, version, filePath, coverUrl: `/games/${req.file.filename}` });
  await game.save();
  res.sendStatus(201);
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
