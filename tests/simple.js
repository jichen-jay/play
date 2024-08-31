import { Readability } from "https://cdn.jsdelivr.net/npm/@mozilla/readability@0.5.0/+esm";
import { JSDOM } from "npm:jsdom";
// import puppeteer from "https://deno.land/x/puppeteer_plus/mod.ts";
import { NodeHtmlMarkdown } from "npm:node-html-markdown";
import { chromium } from "npm:playwright";

const customTranslators = {
  path: (node) => `~${node.textContent}~`,
  meta: (node) => `~${node.textContent}~`,
  picture: (node) => `~${node.textContent}~`,
};

async function initializeBrowser() {
  const userDataDir = "/home/jaykchen/.config/google-chrome";
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    javaScriptEnabled: true,
    executablePath: "/usr/bin/google-chrome",
  });
  return context;
}
const defaultContext = await initializeBrowser();

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
        const nhm = new NodeHtmlMarkdown(
          {}, // options
          customTranslators // customTransformers
        );
        const markdownOutput = nhm.translate(htm);

        console.log(markdownOutput);
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

const urls = ["https://www.selinawamucii.com/insights/prices/canada/pork/"];

const results = await openMultipleTabs(urls, true);
console.log(results);
// "https://www.ontariopork.on.ca/Price-Report",
