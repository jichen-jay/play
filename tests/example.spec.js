const { chromium } = require("playwright");
const html2md = require("html-to-md");
const http = require("http");
const https = require("https");
const { JSDOM, VirtualConsole } = require("jsdom");
const {
  NodeHtmlMarkdown,
  NodeHtmlMarkdownOptions,
} = require("node-html-markdown");

const Readability = require("@mozilla/readability").Readability;

const PORT = 3000; // Change to port 3000
var TurndownService = require("turndown");

var turndownService = new TurndownService();
turndownService.addRule("strikethrough", {
  filter: ["path", "meta", "picture", "svg"],
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
            const virtualConsole = new VirtualConsole();
            virtualConsole.on("error", () => {
              // No-op to skip console errors.
            });
            const dom = new JSDOM(articleContent, {
              url,
              contentType: "text/html",
              includeNodeLocations: true,
              storageQuota: 10000000,
              virtualConsole,
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

// const server = require("http").createServer(async (req, res) => {
//   if (req.method === "POST" && req.url === "/scrape") {
//     let body = "";

//     req.on("data", (chunk) => {
//       body += chunk.toString();
//     });

//     req.on("end", async () => {
//       try {
//         const { urls, toMd } = JSON.parse(body);

//         if (!Array.isArray(urls) || urls.length === 0) {
//           res.writeHead(400, { "Content-Type": "text/plain" });
//           res.end("Please provide a valid array of URLs.\n");
//           return;
//         }

//         console.log(`Processing URLs: ${urls.join(", ")}`);

//         const results = await openMultipleTabs(urls, toMd);

//         res.writeHead(200, { "Content-Type": "application/json" });
//         res.end(JSON.stringify(results));
//       } catch (error) {
//         console.error("An error occurred:", error);
//         res.writeHead(500, { "Content-Type": "text/plain" });
//         res.end(`Error processing URLs: ${error.message}\n`);
//       }
//     });

//     req.on("error", (err) => {
//       console.error(`Request error: ${err.message}`);
//       res.writeHead(500, { "Content-Type": "text/plain" });
//       res.end(`Request error: ${err.message}\n`);
//     });
//   } else {
//     res.writeHead(404, { "Content-Type": "text/plain" });
//     res.end("Not Found\n");
//   }
// });

initializeBrowser();

// server.listen(PORT, async () => {
//   await initializeBrowser();
//   console.log(`Server listening on port ${PORT}`);
// });

// process.on("exit", async () => {
//   if (browser) {
//     await browser.close();
//   }
// });

// process.on("SIGINT", async () => {
//   process.exit();
// });

const Together = require("together-ai");
require("dotenv").config();
const together = new Together({
  apiKey: process.env["TOGETHER_API_KEY"],
});

async function callTogether(query, webText) {
  try {
    const completion = await together.chat.completions.create({
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      messages: [
        {
          role: "system",
          content:
            "You're AI text processing agent. You're tasked to analyze internet search query and the search engine returned webpage text",
        },
        {
          role: "user",
          content: `Given the query "${query}", list your findings from the text concisely, and your confidence number, avoid any boilerplate, don't explain anything: ${webText}`,
        },
      ],
    });
    const ans = completion.choices[0]?.message.content;
    console.log(ans);
    return ans;
  } catch (error) {
    console.error("Failed to call together:", error);
  }
}

async function finalAnswer(query, ansArrayText) {
  try {
    const completion = await together.chat.completions.create({
      model: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
      messages: [
        {
          role: "user",
          content: `given query "${query}", based on findings from previous work "${ansArrayText}", provide final answer concisely:`,
        },
      ],
    });
    console.log("here is my final answer:\n");
    console.log(completion.choices[0]?.message.content);
  } catch (error) {
    console.error("Failed to call together:", error);
  }
}

function bingWebSearch(query) {
  return new Promise((resolve, reject) => {
    https.get(
      {
        hostname: "api.bing.microsoft.com",
        path: "/v7.0/search?q=" + encodeURIComponent(query),
        headers: { "Ocp-Apim-Subscription-Key": process.env["BING_API_KEY"] },
      },
      (res) => {
        let body = "";
        res.on("data", (part) => (body += part));
        res.on("end", () => {
          try {
            const jsonResponse = JSON.parse(body);

            for (let header in res.headers) {
              if (
                header.startsWith("bingapis-") ||
                header.startsWith("x-msedge-")
              ) {
                console.log(header + ": " + res.headers[header]);
              }
            }

            console.log("\nTop 5 Results:\n");

            const webPagesUrls = [];
            const newsUrls = [];

            if (jsonResponse.webPages && jsonResponse.webPages.value) {
              webPagesUrls.push(
                ...jsonResponse.webPages.value
                  .slice(0, 5)
                  .map((item) => item.url)
              );
            }

            if (jsonResponse.news && jsonResponse.news.value) {
              newsUrls.push(
                ...jsonResponse.news.value.slice(0, 5).map((item) => item.url)
              );
            }

            resolve({ webPagesUrls, newsUrls });
          } catch (error) {
            reject("Error parsing JSON response: " + error.message);
          }
        });

        res.on("error", (e) => {
          reject("Error: " + e.message);
        });
      }
    );
  });
}

const query = "where can I find a cheap Intel Arc 770 GPU";

bingWebSearch(query)
  .then(async ({ webPagesUrls, newsUrls }) => {
    console.log("Web Pages URLs:", webPagesUrls);

    const scrapedArray = await openMultipleTabs(webPagesUrls, "");

    var ansArrayText = "";

    if (Array.isArray(scrapedArray)) {
      for (const { url, content: webText } of scrapedArray) {
        const tex = await callTogether(query, webText);

        ansArrayText += tex;
      }
    } else {
      console.error("scrapedArray is not an array:", scrapedArray);
    }

    finalAnswer(ansArrayText);
    console.log("News URLs:", newsUrls);
  })
  .catch((err) => {
    console.error(err);
  });
  