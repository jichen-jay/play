import { Readability } from "https://cdn.jsdelivr.net/npm/@mozilla/readability@0.5.0/+esm";
import html2md from "https://cdn.jsdelivr.net/npm/html-to-md@0.8.5/+esm"; // Use a CDN for html-to-md
import TurndownService from "https://cdn.jsdelivr.net/npm/turndown@7.2.0/+esm";
import { JSDOM } from "npm:jsdom";
import puppeteer from "https://deno.land/x/puppeteer_plus/mod.ts";
import { NodeHtmlMarkdown } from "npm:node-html-markdown";
let browser;
let defaultContext;

async function initializeBrowser() {
  try {
    browser = await puppeteer.launch({
      headless: false,
      executablePath: "/snap/bin/chromium",
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
            var a = document.documentElement.innerText;
            var b = document.documentElement.outerHTML;

            return {
              tex: a,
              htm: b,
            };
          }));

          const dom = new JSDOM(htm, {
            url: url,
            content: "text/html",
          });

          const article = new Readability(dom.window.document, {
            nbTopCandidates: 30,
            charThreshold: 100,
            keepClasses: true,
          }).parse();

          tex = article.textContent.trim();

          htm = article.content;
          // console.log(article.content);

          // console.log("Readability_text:");
          // console.log(tex);
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
        const turndownService = new TurndownService();

        turndownService.addRule("strikethrough", {
          filter: ["path", "meta", "picture"],
          replacement: function (content) {
            return "~" + content + "~";
          },
        });

        const dom = new JSDOM(htm);

        const cleaned = turndownService.turndown(
          dom.window.document.body.innerHTML
        );

        // console.log("Readability_with_link_sections:\n\n");
        console.log(cleaned);

        // this block doesn't work, it didn't recognize the dom object
        try {
          // return {
          //   url,
          //   content: cleaned,
          // };
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
  "https://agriculture.canada.ca/en/sector/animal-industry/red-meat-and-livestock-market-information/prices",
];

const results = await openMultipleTabs(urls, true);
console.log(results);
// "https://www.ontariopork.on.ca/Price-Report",
