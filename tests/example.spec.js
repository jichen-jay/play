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
const END_OF_MESSAGE = "<END_OF_MESSAGE>";
var TurndownService = require("turndown");

var turndownService = new TurndownService();

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

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/scrape") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const { url, toMd } = JSON.parse(body);

        if (!url) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Please provide a valid URL.\n");
          return;
        }

        console.log(`Processing URL: ${url}`);

        const page = await defaultContext.newPage();

        await Promise.race([
          page.goto(url, { waitUntil: "load" }),
          // page.goto(url, { waitUntil: "domcontentloaded" }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Navigation timeout")), 10000)
          ),
        ]);

        const articleContent = await page.evaluate(
          () => document.documentElement.innerHTML
        );

        if (toMd) {
          const markdownContent = NodeHtmlMarkdown.translate(articleContent);
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(markdownContent + END_OF_MESSAGE);
        } else {
          const dom = new JSDOM(articleContent, {
            url: url,
            contentType: "text/html",
            includeNodeLocations: true,
            storageQuota: 10000000,
          });

          const article = new Readability(dom.window.document, {
            nbTopCandidates: 30,
            charThreshold: 100,
            keepClasses: true,
          }).parse();
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(
            article.title +
              "\n" +
              article.byline +
              "\n" +
              article.content +
              END_OF_MESSAGE
          );
        }

        await page.close();
      } catch (error) {
        console.error("An error occurred:", error);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(`Error processing URL: ${error.message}\n`);
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

// Handle process exit to close the browser connection gracefully
process.on("exit", async () => {
  if (browser) {
    await browser.close();
  }
});

process.on("SIGINT", async () => {
  process.exit();
});
