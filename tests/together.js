const Together = require("together-ai");

const together = new Together({
  apiKey: process.env["TOGETHER_API_KEY"],
});
const completion = await together.chat.completions.create({
  model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
  messages: [{ role: "user", content: "Top 3 things to do in New York?" }],
});
