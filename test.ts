import mongoose from "mongoose";

async function test() {
  try {
    const uri = "mongodb+srv://titaniumfact97_db_user:euFFttINBpTY3lxF@cluster0.zawkpdk.mongodb.net/bloodfighters?appName=Cluster0";
    console.log("Connecting...");
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("Connected successfully!");
    process.exit(0);
  } catch (e) {
    console.error("Connection failed:", e);
    process.exit(1);
  }
}

test();
