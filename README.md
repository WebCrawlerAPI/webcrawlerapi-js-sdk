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

## Batch scrape

```javascript
const batch = await client.scrape({
    url: ["https://books.toscrape.com/", "https://books.toscrape.com/catalogue/page-2.html"],
    output_formats: ["markdown"],
    max_concurrency: 5,
})

console.log(batch.status, batch.completed, batch.failed)
for (const item of batch.data) console.log(item.url, item.status, item.markdown_url)
```

Passing an array as `url` to `scrape()` creates a batch and polls until it finishes (a single string still returns a single result). Batch-only options like `max_concurrency` and `ignore_invalid_urls` go in the same request. For manual control use `scrapeBatchAsync({ urls, ... })`, `getBatch(id, { limit, cursor })`, `getBatchErrors(id)` and `cancelBatch(id)`.

Full batch scrape documentation: [docs/batch-scrape.md](docs/batch-scrape.md).

## Run an agent

```javascript
import webcrawlerapi from "webcrawlerapi-js"

const client = new webcrawlerapi.WebcrawlerClient("YOUR_API_KEY")

const result = await client.runAgent({
    prompt: "Visit the provided website and return the page title as JSON.",
    urls: ["https://books.toscrape.com/"],
    seed_urls_only: true,
    output_schema: {
        type: "object",
        properties: {
            title: { type: "string" },
        },
        required: ["title"],
        additionalProperties: false,
    },
    max_spend_usd: 0.02,
})

console.log(result.status, result.data)
```

## Documentation

- [Scraping](docs/scraping.md) — single page, async mode, AI extraction, parameters, response fields
- [Crawling](docs/crawling.md) — multi-page, async mode, combined markdown, parameters, job items
