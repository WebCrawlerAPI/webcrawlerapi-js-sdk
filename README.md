# JS client for WebcrawlerAPI

Webcrawler API for your AI agent. Get markdown of any website or page with a single call.

Official JavaScript/TypeScript client for [WebcrawlerAPI](https://webcrawlerapi.com/) — web scraping and crawling with JS rendering, proxy rotation, and AI extraction.

## Installation

```
npm i webcrawlerapi-js
```

Get your API key at [dash.webcrawlerapi.com/access](https://dash.webcrawlerapi.com/access).

## Scrape a single page

```javascript
import webcrawlerapi from "webcrawlerapi-js"

const client = new webcrawlerapi.WebcrawlerClient("YOUR_API_KEY")

const result = await client.scrape({
    url: "https://books.toscrape.com/",
    output_formats: ["markdown"],
})

console.log(result.markdown)
```

## Crawl multiple pages

```javascript
import webcrawlerapi from "webcrawlerapi-js"

const client = new webcrawlerapi.WebcrawlerClient("YOUR_API_KEY")

const job = await client.crawl({
    url: "https://books.toscrape.com/",
    items_limit: 10,
    output_formats: ["markdown"],
})

for (const item of job.job_items) {
    const content = await item.getContent()
    console.log(item.title, content?.slice(0, 100))
}
```

## Documentation

- [Scraping](docs/scraping.md) — single page, async mode, AI extraction, parameters, response fields
- [Crawling](docs/crawling.md) — multi-page, async mode, combined markdown, parameters, job items
