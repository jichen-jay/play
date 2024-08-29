const { chromium } = require("playwright");
const html2md = require("html-to-md");
const http = require("http");
const { JSDOM } = require("jsdom");
const {
  NodeHtmlMarkdown,
  NodeHtmlMarkdownOptions,
} = require("node-html-markdown");

const Readability = require("@mozilla/readability").Readability;

const PORT = 3000; // Change to port 3000
var TurndownService = require("turndown");

var turndownService = new TurndownService();
turndownService.addRule("strikethrough", {
  filter: ["path", "meta", "picture"],
  replacement: function (content) {
    return "~" + content + "~";
  },
});

let browser;
let defaultContext;

async function initializeBrowser() {
  try {
    browser = await chromium.connectOverCDP("http://localhost:9222");
    defaultContext = browser.contexts()[0];
    console.log("Connected to the browser.");
  } catch (error) {
    console.error("Failed to connect to the browser:", error);
    process.exit(1);
  }
}

async function openMultipleTabs(urls, toMd) {
  const TIMEOUT = 12000; // 12 seconds timeout

  try {
    const pages = await Promise.all(
      urls.map(async (url) => {
        const page = await defaultContext.newPage();
        try {
          await page.goto(url, { waitUntil: "load", timeout: TIMEOUT });
        } catch (error) {
          if (error.name === "TimeoutError") {
            console.warn(`Navigation timeout for ${url}.`);
          } else {
            throw error;
          }
        } finally {
          await page.evaluate(() => {
            window.stop();
          });
        }
        return { page, url };
      })
    );

    const results = await Promise.all(
      pages.map(async ({ page, url }) => {
        try {
          const articleContent = await page.content();

          if (toMd) {
            const markdownContent = NodeHtmlMarkdown.translate(articleContent);
            return { url, content: markdownContent };
          } else {
            const dom = new JSDOM(articleContent, {
              url,
              contentType: "text/html",
              includeNodeLocations: true,
              storageQuota: 10000000,
            });

            const article = new Readability(dom.window.document, {
              nbTopCandidates: 30,
              charThreshold: 100,
              keepClasses: true,
            }).parse();

            const cleaned = turndownService.turndown(article.content);
            return {
              url,
              content: article.title + "\n" + article.byline + "\n" + cleaned,
            };
          }
        } catch (err) {
          console.error(`Error processing ${url}:`, err);
          return { url, content: null, error: err.message };
        } finally {
          await page.close();
        }
      })
    );

    return results;
  } catch (err) {
    console.error("An error occurred:", err);
    return [];
  }
}

const server = require("http").createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/scrape") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const { urls, toMd } = JSON.parse(body);

        if (!Array.isArray(urls) || urls.length === 0) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Please provide a valid array of URLs.\n");
          return;
        }

        console.log(`Processing URLs: ${urls.join(", ")}`);

        const results = await openMultipleTabs(urls, toMd);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(results));
      } catch (error) {
        console.error("An error occurred:", error);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(`Error processing URLs: ${error.message}\n`);
      }
    });

    req.on("error", (err) => {
      console.error(`Request error: ${err.message}`);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(`Request error: ${err.message}\n`);
    });
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found\n");
  }
});

server.listen(PORT, async () => {
  await initializeBrowser();
  console.log(`Server listening on port ${PORT}`);
});

process.on("exit", async () => {
  if (browser) {
    await browser.close();
  }
});

process.on("SIGINT", async () => {
  process.exit();
});

const Together = require("together-ai");
require("dotenv").config();
const together = new Together({
  apiKey: process.env["TOGETHER_API_KEY"],
});

async function callTogether() {
  try {
    const completion = await together.chat.completions.create({
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      messages: [{ role: "user", content: "Top 3 things to do in New York?" }],
    });
    console.log(completion.choices[0]?.message.content);
  } catch (error) {
    console.error("Failed to call together:", error);
  }
}

// callTogether();
