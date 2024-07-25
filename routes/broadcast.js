const express = require("express");
const router = express.Router();
const { broadcastMessage } = require("../broadcast");

router.get("/", (req, res) => {
  if (req.session.authenticated) {
    res.render("broadcast");
  } else {
    res.redirect("/");
  }
});

router.post("/", async (req, res) => {
  const { title, message, link } = req.body;
  try {
    await broadcastMessage(title, message, link);
    res.render("broadcast", { message: "Message broadcasted successfully!" });
  } catch (error) {
    res.render("broadcast", { message: "Error broadcasting message." });
  }
});

module.exports = router;
