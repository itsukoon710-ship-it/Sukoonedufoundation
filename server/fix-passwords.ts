import { db } from "./db.js";
import { users } from "../shared/schema.js";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

const SALT_ROUNDS = 10;

async function fixPasswords() {
  console.log("Checking for users with unhashed passwords...");
  
  try {
    // Get all users
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users`);
    
    let fixedCount = 0;
    
    for (const user of allUsers) {
      // Check if password is already hashed (bcrypt hashes start with $2b$ or $2a$)
      const isHashed = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');
      
      if (!isHashed) {
        console.log(`Fixing password for user: ${user.username}`);
        const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
        await db.update(users).set({ password: hashedPassword }).where(sql`${users.id} = ${user.id}`);
        fixedCount++;
      }
    }
    
    console.log(`Fixed ${fixedCount} users with unhashed passwords`);
    console.log("Password fix complete!");
  } catch (error) {
    console.error("Error fixing passwords:", error);
  }
}

// Run if this file is executed directly
fixPasswords().then(() => process.exit(0)).catch(() => process.exit(1));
