import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    
    if (!mongoURI) {
      console.error("MONGO_URI is not defined in environment variables");
      process.exit(1);
    }

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      connectTimeoutMS: 10000, // 10 seconds connection timeout
      maxPoolSize: 10, // Maintain up to 10 socket connections
      retryWrites: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.error("Error details:", {
      name: error.name,
      code: error.code,
      message: error.message
    });
    
    // Provide helpful troubleshooting tips
    if (error.message.includes('ETIMEDOUT')) {
      console.error("\n⚠️  Connection timeout detected. Possible causes:");
      console.error("1. MongoDB server is down or unreachable");
      console.error("2. Network connectivity issues");
      console.error("3. Firewall blocking the connection");
      console.error("4. IP address not whitelisted (if using MongoDB Atlas)");
      console.error("5. Incorrect connection string in .env file");
    }
    
    process.exit(1);
  }
};

export default connectDB;
