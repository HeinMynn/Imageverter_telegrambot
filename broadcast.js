const fetch = require("node-fetch");
const dotenv = require("dotenv");
const { MongoClient } = require("mongodb");

dotenv.config();
const BOT_TOKEN = process.env.BOT_TOKEN;
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

async function getUsers() {
  await connectToDB();
  return await usersCollection.find({}).toArray();
}

const sendMessage = async (userId, text, link) => {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: userId,
    text: text,
    parse_mode: "MarkdownV2",
    reply_markup: JSON.stringify({
      inline_keyboard: [[{ text: "Learn More", url: link }]],
    }),
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

const broadcastMessage = async (title, message, link) => {
  const users = await getUsers();
  for (const user of users) {
    const escapedTitle = title.replace(/([*_`\[\](){}/+-.!])/g, "\\$1"); // Escape special characters
    const escapedMessage = message.replace(/([*_`\[\](){}/+-.!])/g, "\\$1"); // Escape special characters
    const text = `*${escapedTitle}*\n\n${escapedMessage}`;
    const result = await sendMessage(user.user_id, text, link);
    console.log(`Message sent to user ID ${user.user_id}:`, result);
  }
};

module.exports = { broadcastMessage };
