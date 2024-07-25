const sharp = require("sharp");
const fetch = require("node-fetch");
const { saveUser } = require("./users");

const userStates = {}; // To track user states
const processingMessages = {}; // To track processing messages

module.exports = function (bot) {
  const servicesKeyboard = {
    reply_markup: {
      keyboard: [["Change Format", "Optimize", "Resize"]],
      one_time_keyboard: false,
      resize_keyboard: true,
    },
  };

  const cancelKeyboard = {
    reply_markup: {
      keyboard: [["Cancel"]],
      one_time_keyboard: false,
      resize_keyboard: true,
    },
  };

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;
    userStates[chatId] = null; // Reset user state

    const userData = {
      user_id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
    };

    await saveUser(userData); // Save user to MongoDB

    bot.sendMessage(chatId, "Choose a service:", servicesKeyboard);
  });

  bot.onText(/Change Format/, (msg) => {
    const chatId = msg.chat.id;
    userStates[chatId] = "changing_format"; // Set user state
    bot.sendMessage(chatId, "Choose the format to change to:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "JPG", callback_data: "format_jpg" }],
          [{ text: "PNG", callback_data: "format_png" }],
          [{ text: "GIF", callback_data: "format_gif" }],
          [{ text: "WEBP", callback_data: "format_webp" }],
          [{ text: "HEIC", callback_data: "format_heic" }],
          [{ text: "Cancel", callback_data: "cancel" }],
        ],
      },
    });
  });

  bot.onText(/Optimize/, (msg) => {
    const chatId = msg.chat.id;
    userStates[chatId] = "optimizing"; // Set user state
    bot.sendMessage(chatId, "Send the image as a file.", cancelKeyboard);
  });

  bot.onText(/Resize/, (msg) => {
    const chatId = msg.chat.id;
    userStates[chatId] = "resizing"; // Set user state
    bot.sendMessage(chatId, "Send the image as a file.", cancelKeyboard);
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;

    if (msg.text === "Cancel") {
      userStates[chatId] = null; // Reset user state
      bot.sendMessage(
        chatId,
        "Operation canceled. Choose another service:",
        servicesKeyboard
      );
    } else if (msg.document || msg.photo) {
      // If a file is sent
      if (userStates[chatId] === "optimizing") {
        handleOptimize(chatId, msg);
      } else if (userStates[chatId] === "resizing") {
        handleResize(chatId, msg);
      }
    }
  });

  bot.on("callback_query", async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const action = callbackQuery.data;

    if (action.startsWith("format_")) {
      const format = action.split("_")[1];
      userStates[chatId] = "changing_format"; // Set user state
      bot.sendMessage(chatId, "Send the image as a file.", cancelKeyboard);
      bot.once("document", async (msg) => {
        if (msg.chat.id === chatId) {
          await handleFormatChange(chatId, msg, format); // Correct function name
        }
      });
    } else if (action === "cancel") {
      userStates[chatId] = null; // Reset user state
      bot.sendMessage(
        chatId,
        "Operation canceled. Choose another service:",
        servicesKeyboard
      );
    }
  });

  async function handleFormatChange(chatId, msg, format) {
    if (!msg.document) {
      await bot.sendMessage(
        chatId,
        "Please send the image as a file, not as a photo."
      );
      return;
    }
    if (userStates[chatId] !== "changing_format") {
      return;
    }
    // Send processing message
    const processingMsg = await bot.sendMessage(
      chatId,
      "Processing your image, please wait..."
    );
    processingMessages[chatId] = processingMsg.message_id;

    try {
      // Fetch the file
      const fileId = msg.document.file_id;
      const file = await bot.getFile(fileId);
      const filePath = file.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
      console.log(`File URL: ${fileUrl}`);

      // Download the file
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("Failed to fetch the file");
      const buffer = await response.buffer();
      console.log(`Buffer size: ${buffer.length}`);

      // Process the image
      if (!buffer) throw new Error("Failed to load image buffer");

      const validFormats = ["jpeg", "png", "gif", "webp", "heic"];
      if (!validFormats.includes(format)) {
        throw new Error(`Unsupported format: ${format}`);
      }

      const output = await sharp(buffer).toFormat(format).toBuffer();

      console.log(`Output format: ${format}`);
      // Send the processed image
      await bot.sendDocument(chatId, output, {
        caption: `Image converted to ${format}`,
      });
      await bot.sendMessage(
        chatId,
        "Your image has been converted successfully!"
      );
    } catch (error) {
      console.error(`Error processing image: ${error.message}`);
      await bot.sendMessage(
        chatId,
        `An error occurred while processing the image: ${error.message}`
      );
    } finally {
      // Clean up the processing message
      if (processingMessages[chatId]) {
        await bot.deleteMessage(chatId, processingMessages[chatId]);
        delete processingMessages[chatId];
      }

      // Reset user state and show main menu
      userStates[chatId] = null; // Reset user state
      await bot.sendMessage(
        chatId,
        "Choose another service:",
        servicesKeyboard
      ); // Return to main menu
    }
  }

  async function handleOptimize(chatId, msg) {
    if (!msg.document) {
      bot.sendMessage(
        chatId,
        "Please send the image as a file, not as a photo."
      );
      return;
    }

    bot.sendMessage(chatId, "Enter the optimization level (0-100):");
    bot.once("message", async (optimizationMsg) => {
      const quality = parseInt(optimizationMsg.text, 10);

      if (isNaN(quality) || quality < 0 || quality > 100) {
        bot.sendMessage(
          chatId,
          "Please enter a valid optimization level between 0 and 100."
        );
        return;
      }

      const processingMsg = await bot.sendMessage(
        chatId,
        "Processing your image, please wait..."
      );
      processingMessages[chatId] = processingMsg.message_id;

      try {
        const fileId = msg.document.file_id;
        const file = await bot.getFile(fileId);
        const filePath = file.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;

        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("Failed to fetch the file");
        const buffer = await response.buffer();

        const metadata = await sharp(buffer).metadata();
        const format = metadata.format;

        let output;
        if (format === "jpeg") {
          output = await sharp(buffer).jpeg({ quality }).toBuffer();
        } else if (format === "png") {
          output = await sharp(buffer)
            .png({ compressionLevel: Math.floor(quality / 10) })
            .toBuffer();
        } else if (format === "gif") {
          output = await sharp(buffer).gif({ quality }).toBuffer();
        } else {
          bot.sendMessage(
            chatId,
            "Optimization is not supported for this format."
          );
          return;
        }

        await bot.sendDocument(chatId, output, {
          caption: `Image optimized with quality level ${quality}`,
        });
        await bot.sendMessage(
          chatId,
          "Your image has been optimized successfully!"
        );
      } catch (error) {
        bot.sendMessage(
          chatId,
          "An error occurred while optimizing the image."
        );
      } finally {
        // Clean up the processing message
        if (processingMessages[chatId]) {
          await bot.deleteMessage(chatId, processingMessages[chatId]);
          delete processingMessages[chatId];
        }

        // Reset user state and show main menu
        userStates[chatId] = null; // Reset user state
        await bot.sendMessage(
          chatId,
          "Choose another service:",
          servicesKeyboard
        ); // Return to main menu
      }
    });
  }

  async function handleResize(chatId, msg) {
    if (!msg.document) {
      bot.sendMessage(
        chatId,
        "Please send the image as a file, not as a photo."
      );
      return;
    }

    bot.sendMessage(chatId, "Send the width and height (e.g., 800x600).");
    bot.once("message", async (widthHeightMsg) => {
      const [width, height] = widthHeightMsg.text.split("x").map(Number);

      if (isNaN(width) || isNaN(height)) {
        bot.sendMessage(chatId, "Please enter valid width and height.");
        return;
      }

      const processingMsg = await bot.sendMessage(
        chatId,
        "Processing your image, please wait..."
      );
      processingMessages[chatId] = processingMsg.message_id;

      try {
        const fileId = msg.document.file_id;
        const file = await bot.getFile(fileId);
        const filePath = file.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;

        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("Failed to fetch the file");
        const buffer = await response.buffer();

        const output = await sharp(buffer).resize(width, height).toBuffer();
        await bot.sendDocument(chatId, output, {
          caption: `Image resized to ${width}x${height}`,
        });
        await bot.sendMessage(
          chatId,
          "Your image has been resized successfully!"
        );
      } catch (error) {
        bot.sendMessage(chatId, "An error occurred while resizing the image.");
      } finally {
        // Clean up the processing message
        if (processingMessages[chatId]) {
          await bot.deleteMessage(chatId, processingMessages[chatId]);
          delete processingMessages[chatId];
        }

        // Reset user state and show main menu
        userStates[chatId] = null; // Reset user state
        await bot.sendMessage(
          chatId,
          "Choose another service:",
          servicesKeyboard
        ); // Return to main menu
      }
    });
  }
};
