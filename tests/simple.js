import { Readability } from "https://cdn.jsdelivr.net/npm/@mozilla/readability@0.5.0/+esm";
import { JSDOM } from "npm:jsdom";
import puppeteer from "https://deno.land/x/puppeteer_plus/mod.ts";
import { NodeHtmlMarkdown } from "npm:node-html-markdown";

const customTranslators = {
  path: (node) => `~${node.textContent}~`,
  meta: (node) => `~${node.textContent}~`,
  picture: (node) => `~${node.textContent}~`,
};

async function initializeBrowser() {
  try {
    const browser = await puppeteer.launch({
      headless: false, // Use headless mode for better performance
      executablePath: "/usr/bin/google-chrome",
      args: [
        `--user-data-dir=/home/jaykchen/.config/google-chrome`,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920x1080",
      ],
    });
    console.log("Connected to the browser.");
    return browser;
  } catch (error) {
    console.error("Failed to connect to the browser:", error);
    throw error;
  }
}
async function processPage(page, url) {
  const TIMEOUT = 12000; // 12 seconds timeout

  try {
    await page.goto(url, { waitUntil: "load", timeout: TIMEOUT });
    await page.evaluate(() => window.stop()); // Stop any further loading of resources

    const { tex, htm } = await page.evaluate(() => ({
      tex: document.documentElement.innerText,
      htm: document.documentElement.outerHTML,
    }));

    const dom = new JSDOM(htm, { url, contentType: "text/html" });
    const article = new Readability(dom.window.document).parse();

    if (article) {
      const title = article.title || "No Title";
      const byline = article.byline || "No Byline";
      const content = article.content || "No Content";
      const textContent = article.textContent.trim() || "No Text Content";

      return {
        tex: `${title}\n${byline}\n${textContent}`,
        htm: `${title}\n${byline}\n${content}`,
        url,
      };
    } else {
      return { tex, htm, url };
    }
  } catch (error) {
    if (error.name === "TimeoutError") {
      console.warn(`Navigation timeout for ${url}.`);
      return { url, tex: null, htm: null };
    }
    throw error;
  }
}

async function openMultipleTabs(browser, urls) {
  const context = browser.defaultBrowserContext();

  try {
    const results = await Promise.all(
      urls.map(async (url) => {
        const page = await context.newPage();

        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36"
        );

        await page.setViewport({ width: 1920, height: 1080 });
        try {
          const { tex, htm } = await processPage(page, url);
          const nhm = new NodeHtmlMarkdown({}, customTranslators);
          const markdownOutput = nhm.translate(htm);

          return { url, readahText: tex, readahMd: markdownOutput };
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

(async () => {
  const browser = await initializeBrowser();

  try {
    const urls = ["https://www.theverge.com/"];
    const results = await openMultipleTabs(browser, urls);

    console.log(results);
  } finally {
    await browser.close(); // Ensure the browser is closed after processing
  }
})();
