import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import { registerUser } from './src/app/actions/register';

async function main() {
  try {
    const result = await registerUser({
      email: "test.login.flow@example.com",
      password: "password123",
      name: "Test Login User",
      role: "CLIENT"
    });
    console.log("Registration result:", result);
  } catch (err: any) {
    console.error("Error creating user:", err.message);
  } finally {
    process.exit(0);
  }
}

main();
