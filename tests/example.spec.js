const { chromium } = require("playwright");
const fs = require("fs");
const html2md = require("html-to-md");
const net = require("net");

const PORT = 4000; // Change to port 4000
const END_OF_MESSAGE = "<END_OF_MESSAGE>";
const server = net.createServer(async (socket) => {
  socket.on("data", async (data) => {
    const url = data.toString().trim();
    console.log(`Processed URL: ${url}`);

    if (!url) {
      socket.write("Please provide a valid URL.\n");
      return;
    }

    try {
      const browser = await chromium.connectOverCDP("http://localhost:9222");
      const defaultContext = browser.contexts()[0];
      const page = await defaultContext.newPage();

      await Promise.race([
        page.goto(url, { waitUntil: "domcontentloaded" }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Navigation timeout")), 3000)
        ),
      ]);

      const articleContent = await page.evaluate(
        () => document.documentElement.innerHTML
      );
      const markdownContent = html2md(articleContent);
      console.log(`HTML content obtained for URL: ${markdownContent}`);

      //want js code to send the content in one chunk,
      socket.write(markdownContent + END_OF_MESSAGE);

      await page.close();
    } catch (error) {
      console.error("An error occurred:", error);
      socket.write(`Error processing URL: ${error.message}\n`);
    }
  });

  socket.on("end", () => {
    console.log("Client disconnected");
  });

  socket.on("error", (err) => {
    console.error(`Socket error: ${err.message}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
