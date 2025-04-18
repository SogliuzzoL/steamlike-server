const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

mongoose.connect('mongodb://localhost:27017/steamlike', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
});

const User = mongoose.model('User', UserSchema);

async function createSuperAdmin() {
  const username = 'superadmin';
  const password = 'superpassword'; // à changer
  const hash = await bcrypt.hash(password, 10);

  const existing = await User.findOne({ username });
  if (existing) {
    console.log('❌ Super admin already exists.');
    process.exit(1);
  }

  const admin = new User({ username, password: hash, role: 'admin' });
  await admin.save();
  console.log('✅ Super admin created.');
  process.exit(0);
}

createSuperAdmin();
