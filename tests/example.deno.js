import { Readability } from "https://cdn.jsdelivr.net/npm/@mozilla/readability@0.5.0/+esm";
import Together from "npm:together-ai";
import html2md from "https://cdn.jsdelivr.net/npm/html-to-md@0.8.5/+esm"; // Use a CDN for html-to-md
import TurndownService from "https://cdn.jsdelivr.net/npm/turndown@7.2.0/+esm";
import { config } from "https://deno.land/x/dotenv/mod.ts";
// import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts"; // Use a Deno-compatible version if available
import { assert } from "jsr:@std/assert@1";
import { JSDOM } from "npm:jsdom";
import puppeteer from "https://deno.land/x/puppeteer_plus/mod.ts";
import { NodeHtmlMarkdown } from "npm:node-html-markdown";
let browser;
let defaultContext;

async function initializeBrowser() {
  try {
    browser = await puppeteer.launch({
      headless: false,
      userDataDir: "/home/jaykchen/.config/google-chrome",
      executablePath: "/usr/bin/google-chrome",
    });
    defaultContext = browser.defaultBrowserContext();
    console.log("Connected to the browser.");
  } catch (error) {
    console.error("Failed to connect to the browser:", error);
  }
}

async function openMultipleTabs(urls, toMd) {
  const TIMEOUT = 12000; // 12 seconds timeout

  try {
    const pages = await Promise.all(
      urls.map(async (url) => {
        const page = await defaultContext.newPage();
        let tex;
        let htm;

        try {
          await page.goto(url, { waitUntil: "load", timeout: TIMEOUT });

          await page.evaluate(() => {
            window.stop(); // Stop any further loading of resources
          });

          ({ tex, htm } = await page.evaluate(() => {
            return {
              tex: document.documentElement.innerText,
              htm: document,
            };
          }));

          const dom = new JSDOM(htm, {
            nbTopCandidates: 30,
            charThreshold: 100,
            keepClasses: false,
          });
          const article = new Readability(dom.window.document).parse();

          console.log(article.content);
        } catch (error) {
          if (error.name === "TimeoutError") {
            console.warn(`Navigation timeout for ${url}.`);
          } else {
            throw error;
          }
        } finally {
          await page.close(); // Close the page after processing
        }
        return { tex, htm, url };
      })
    );

    const results = await Promise.all(
      pages.map(async ({ tex, htm, url }) => {
        try {
          // console.log("text\n");
          // console.log(tex);
          // console.log("htm\n\n");
          // console.log(htm);
          // console.log("dm\n\n\n");
          // console.log(markdown);
          //   const markdownContent = NodeHtmlMarkdown.translate(htm);
          //   console.log(markdownContent);
          // } catch (err) {
          //   console.error(`Error processing ${url}:`, err);
          // }
          // const dom = new JSDOM(dm, {
          //   url: url,
          //   contentType: "text/html",
          //   includeNodeLocations: true,
          //   storageQuota: 10000000,
          // });
          // if (!dom) {
          //   throw new Error("Failed to parse document");
          // }
          // const turndownService = new TurndownService();
          // const cleaned = turndownService.turndown(dom);
          // console.log(cleaned);
          // const article = new Readability(dom.window.document, {
          //   nbTopCandidates: 30,
          //   charThreshold: 100,
          //   keepClasses: true,
          // }).parse();
          // console.log(article.content);
          // content: article.title + "\n" + article.byline + "\n" + cleaned,
        } catch (err) {
          console.error(`Error processing ${url}:`, err);
          return { url, content: null, error: err.message };
        } finally {
          // await page.close();
        }
      })
    );

    return results;
  } catch (err) {
    console.error("An error occurred:", err);
    return [];
  }
}

await initializeBrowser();

Deno.addSignalListener("SIGINT", async () => {
  if (browser) await browser.close();
});

Deno.addSignalListener("SIGINT", async () => {
  if (browser) await browser.close();
});

const env = config();

const together = new Together({
  apiKey: env["TOGETHER_API_KEY"],
});

async function callTogether(query, webText) {
  try {
    const completion = await together.chat.completions.create({
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      messages: [
        {
          role: "system",
          content:
            "You're an AI text processing agent. You're tasked to analyze an internet search query and the search engine returned webpage text.",
        },
        {
          role: "user",
          content: `Given the query "${query}", focus on information that matches verbatim with keywords in the query in the source text. List your findings most relevant to the query from the text concisely, and your confidence number. Reply in strictly formed JSON: { "findings": "your findings", "confidence": confidence score as a Float number }, don't explain anything: ${webText}`,
        },
      ],
    });

    const ans = completion.choices[0]?.message.content.trim();

    if (ans) {
      let parsedAns;
      try {
        parsedAns = JSON.parse(ans);
      } catch (parseError) {
        console.error("Failed to parse JSON:", parseError);
        return null;
      }

      if (parsedAns.confidence > 0.9) {
        console.log(parsedAns);
        return parsedAns.findings;
      }
    }
  } catch (error) {
    console.error("Failed to call together:", error);
  }

  return null; // Return null if no valid answer is found
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

async function bingWebSearch(query) {
  const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(
    query
  )}`;
  const headers = {
    "Ocp-Apim-Subscription-Key": env["BING_API_KEY"], // Use env from dotenv
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const jsonResponse = await response.json();

    console.log("\nTop 5 Results:\n");

    const webPagesUrls = [];
    const newsUrls = [];

    if (jsonResponse.webPages && jsonResponse.webPages.value) {
      webPagesUrls.push(
        ...jsonResponse.webPages.value.slice(0, 1).map((item) => item.url)
      );
    }

    if (jsonResponse.news && jsonResponse.news.value) {
      newsUrls.push(
        ...jsonResponse.news.value.slice(0, 1).map((item) => item.url)
      );
    }

    return { webPagesUrls, newsUrls };
  } catch (error) {
    console.error("Error fetching Bing search results:", error);
    throw error;
  }
}

const query = "go get text on http://example.com/";

bingWebSearch(query)
  .then(async ({ webPagesUrls, newsUrls }) => {
    console.log("Web Pages URLs:", webPagesUrls);

    const scrapedArray = await openMultipleTabs(webPagesUrls, "");

    var ansArrayText = "";

    if (Array.isArray(scrapedArray)) {
      for (const item of scrapedArray) {
        if (!item || !item.url || !item.content) {
          continue;
        }

        const { url, content: webText } = item;

        const tex = await callTogether(query, webText);
        if (tex) {
          console.log(tex);
          ansArrayText += tex + "\n";
        }
      }
    } else {
      console.error("scrapedArray is not an array:", scrapedArray);
    }

    finalAnswer(query, ansArrayText);
    console.log("News URLs:", newsUrls);
  })
  .catch((err) => {
    console.error(err);
  });
