const TelegramBot = require("node-telegram-bot-api");
const dotenv = require("dotenv");
const bot = require("./bot");

dotenv.config();

const token = process.env.BOT_TOKEN;

const telegramBot = new TelegramBot(token, { polling: true });

bot(telegramBot);

console.log("Bot is running...");
