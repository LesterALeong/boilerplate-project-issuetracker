"use strict";

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const apiRoutes = require("./routes/api.js");
const fccTestingRoutes = require("./routes/fcctesting.js");
const runner = require("./test-runner");

const app = express();

app.use("/public", express.static(process.cwd() + "/public"));
app.use(cors({ origin: "*" })); // FCC testing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sample front-end
app.route("/:project/").get((req, res) => {
  res.sendFile(process.cwd() + "/views/issue.html");
});

// Index page (static HTML)
app.route("/").get((req, res) => {
  res.sendFile(process.cwd() + "/views/index.html");
});

// FCC testing routes
fccTestingRoutes(app);

// API routes
apiRoutes(app);

// 404
app.use(function (req, res) {
  res.status(404).type("text").send("Not Found");
});

// Start & run tests
const listener = app.listen(process.env.PORT || 3000, function () {
  console.log("Your app is listening on port " + listener.address().port);
  if (process.env.NODE_ENV === "test") {
    console.log("Running Tests...");
    setTimeout(function () {
      try {
        runner.run();
      } catch (e) {
        console.log("Tests are not valid:");
        console.error(e);
      }
    }, 3500);
  }
});

module.exports = app; // for testing
