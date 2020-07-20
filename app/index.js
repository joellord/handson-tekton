const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get(`/health`, (req, res) => {
  res.send({
    healthy: true
  }).status(200);
});

app.get("/add/:num1/:num2", (req, res) => {
  console.log(`Adding ${req.params.num1} + ${req.params.num2}`);
  console.log(`Result is ${req.params.num1 + req.params.num2}`);
  res.send({
    num1: req.params.num1,
    num2: req.params.num2,
    result: req.params.num1 + req.params.num2
  }).status(200);
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

module.exports = app;