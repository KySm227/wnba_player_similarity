const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, "build")));

// Serve static images from public folder
app.use("/WNBA.png", express.static(path.join(__dirname, "public", "WNBA.png")));
app.use("/static", express.static(path.join(__dirname, "build", "static")));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
  console.log(`Serving from: ${path.join(__dirname, "build")}`);
});

