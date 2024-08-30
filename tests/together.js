import Together from "npm:together-ai";
import dotenv from "npm:dotenv";

dotenv.config();
const together = new Together({
  apiKey: Deno.env.get("TOGETHER_API_KEY"),
});
const completion = await together.chat.completions.create({
  model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
  messages: [{ role: "user", content: "Top 3 things to do in New York?" }],
});
console.log(completion);
