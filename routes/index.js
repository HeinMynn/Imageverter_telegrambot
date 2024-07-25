// routes/index.js
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("login", { error: null });
});

module.exports = router;
