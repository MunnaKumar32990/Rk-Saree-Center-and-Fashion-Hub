import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.js";

dotenv.config();

const verifyAllExistingUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Update all existing users to have verified emails
    const result = await User.updateMany(
      { isEmailVerified: { $ne: true } },
      { 
        $set: { 
          isEmailVerified: true,
          emailVerificationToken: undefined,
          emailVerificationExpires: undefined
        } 
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} users`);
    console.log("✅ All existing users are now verified!");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

verifyAllExistingUsers();
