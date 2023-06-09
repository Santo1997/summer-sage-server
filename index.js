const express = require("express");
var cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello Summer Camp!");
});

app.listen(port, () => {
  console.log(`Summer Camp listening on port ${port}`);
});
