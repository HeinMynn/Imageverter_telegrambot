const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();
const uri = process.env.MONGO_URI;

let client;
let usersCollection;

async function connectToDB() {
  if (!client) {
    client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();
    const db = client.db("imagverter_bot");
    usersCollection = db.collection("telegramUsers");
  }
}

async function saveUser(user) {
  await connectToDB();
  await usersCollection.updateOne(
    { user_id: user.user_id },
    { $set: user },
    { upsert: true }
  );
}

async function getUser(userId) {
  await connectToDB();
  return await usersCollection.findOne({ user_id: userId });
}

module.exports = {
  saveUser,
  getUser,
};
