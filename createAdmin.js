
const connectDb = require("./config/dbconfig");
const User = require("./models/user");

async function createAdmin() {
  await connectDb();

  const adminExists = await User.findOne({
    emailId: "admin@seekvialove.com"
  });

  if (adminExists) {
    console.log("Admin already exists ✅");
    process.exit();
  }


  await User.create({
    firstName: "Admin",
    lastName: "User",
    emailId: "admin@seekvialove.com",
    password: "admin",
    role: "admin",
    gender: "others"   
  });

  console.log("Admin created successfully 🚀");
  process.exit();
}

createAdmin();