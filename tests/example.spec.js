const { chromium } = require("playwright"); // Or 'firefox' or 'webkit'.
const fs = require("fs");
// const path = require("path");
const { JSDOM } = require("jsdom");
const Readability = require("@mozilla/readability").Readability;

const url = process.argv[2];

if (!url) {
  console.error("Please provide a URL as a command line argument.");
  process.exit(1);
}

(async () => {
  const browser = await chromium.connectOverCDP("http://localhost:9222");

  const defaultContext = browser.contexts()[0];

  //want to open a tab, not a page
  const page = await defaultContext.newPage();

  await page.goto(url);

  const articleContent = await page.evaluate(() => {
    return document.documentElement.innerHTML; // Get full HTML content
  });

  const dom = new JSDOM(articleContent, {
    url: url,
    contentType: "text/html",
    includeNodeLocations: true,
    storageQuota: 10000000,
  });

  const article = new Readability(dom.window.document).parse();

  if (article) {
    // const urlObject = new URL(url);
    // const authoritySegment = urlObject.hostname;

    // const markdownFilePath = path.join(__dirname, `output.md`);
    fs.writeFileSync(`output.md`, article.content);

    // console.log(`Extracted content written to ${markdownFilePath}`);
  } else {
    console.error("Failed to extract article content.");
  }

  // want to close the tab opened above, but leave Chrome running, change the line
  await page.close();

  process.exit(0);
})();
