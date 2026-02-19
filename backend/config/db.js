const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes
    await createIndexes();
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const createIndexes = async () => {
  const collections = ['tokens', 'users', 'queuehistories'];
  
  for (const collection of collections) {
    try {
      await mongoose.connection.createCollection(collection);
    } catch (err) {
      // Collection might already exist
    }
  }
  
  // Create indexes for better performance
  const Token = mongoose.model('Token');
  const User = mongoose.model('User');
  
  await Token.collection.createIndex({ token_number: 1 });
  await Token.collection.createIndex({ status: 1 });
  await Token.collection.createIndex({ priority: -1 });
  await User.collection.createIndex({ email: 1 }, { unique: true });
};

module.exports = connectDB;