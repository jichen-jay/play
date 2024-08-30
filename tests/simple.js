import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
// import { NodeHtmlMarkdown } from "npm:node-html-markdown";
import TurndownService from "https://cdn.jsdelivr.net/npm/turndown@7.2.0/+esm";
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
        let content;
        try {
          await page.goto(url, { waitUntil: "load", timeout: TIMEOUT });

          await page.evaluate(() => {
            window.stop(); // Stop any further loading of resources
          });

          content = await page.evaluate(() => {
            return document.documentElement.outerHTML;
          });
        } catch (error) {
          if (error.name === "TimeoutError") {
            console.warn(`Navigation timeout for ${url}.`);
          } else {
            throw error;
          }
        } finally {
          await page.close(); // Close the page after processing
        }
        return { content, url };
      })
    );

    const results = await Promise.all(
      pages.map(async ({ content, url }) => {
        // the following block work in previous iteration, it handled content as dom object
        // try {
        //   const markdownContent = NodeHtmlMarkdown.translate(content);
        //   return {
        //     url,
        //     content: markdownContent,
        //   };
        // } catch (err) {
        //   console.error(`Error processing ${url}:`, err);
        //   return { url, content: null, error: err.message };
        // }

        // this block doesn't work, it didn't recognize the dom object
        try {
          const turndownService = new TurndownService();
          const cleaned = turndownService.turndown(content);
          return {
            url,
            content: cleaned,
          };
        } catch (err) {
          console.error(`Error processing ${url}:`, err);
          return { url, content: null, error: err.message };
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

const urls = [
  "https://www.selinawamucii.com/insights/prices/canada/pork/",
  "https://www.ontariopork.on.ca/Price-Reporting/Price-Calculation",
  "https://www.ontariopork.on.ca/Price-Report/Daily-Market-Outlook",
  "https://www.ontariopork.on.ca/Price-Report",
  "https://agriculture.canada.ca/en/sector/animal-industry/red-meat-and-livestock-market-information/prices",
];

const results = await openMultipleTabs(urls, true);
console.log(results);
