// app.js
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");
const app = express();

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

const indexRouter = require("./routes/index");
const authRouter = require("./routes/auth");
const broadcastRouter = require("./routes/broadcast");

app.use("/", indexRouter);
app.use("/auth", authRouter);
app.use("/broadcast", broadcastRouter);

app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");
});
