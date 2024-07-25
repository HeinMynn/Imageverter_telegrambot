// routes/auth.js
const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");

dotenv.config();

const username = process.env.USERNAME;
const password = process.env.PASSWORD;

// Replace this with your authentication logic
const authenticate = (username, password) => {
  return username === `${username}` && password === `${password}`;
};

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (authenticate(username, password)) {
    req.session.authenticated = true;
    res.redirect("/broadcast");
  } else {
    res.render("login", { error: "Invalid credentials" });
  }
});

module.exports = router;
