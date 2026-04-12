# Crawling

Multi-page crawling with automatic link discovery.

## Synchronous Job

The promise resolves when all pages are crawled. Best for short jobs.

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
    console.log("---- " + item.title + " ----")
    console.log(content?.slice(0, 100))
}
```

## Asynchronous Job

Get a job ID immediately and poll for results yourself. Recommended for large-scale crawls.

```javascript
import webcrawlerapi from "webcrawlerapi-js"

const client = new webcrawlerapi.WebcrawlerClient("YOUR_API_KEY")

const { id: jobId } = await client.crawlAsync({
    url: "https://books.toscrape.com/",
    items_limit: 10,
    output_formats: ["markdown"],
})

console.log("Job id:", jobId)
console.log("Dashboard:", `https://dash.webcrawlerapi.com/jobs/job/${jobId}`)

let job = await client.getJob(jobId)
while (job.status === "new" || job.status === "in_progress") {
    const delay = job.recommended_pull_delay_ms || 2000
    await new Promise(resolve => setTimeout(resolve, delay))
    job = await client.getJob(jobId)
}

for (const item of job.job_items) {
    const content = await item.getContent()
    console.log(content?.slice(0, 100))
}
```

## Get Combined Markdown

Fetch all crawled pages merged into a single markdown document.

```javascript
const markdown = await client.getJobMarkdownContent(jobId)
console.log(markdown)
```

## TypeScript

```typescript
import { WebcrawlerClient, WebcrawlerApiError, CrawlRequest } from "webcrawlerapi-js"

const client = new WebcrawlerClient("YOUR_API_KEY")

try {
    const job = await client.crawl({
        url: "https://books.toscrape.com/",
        items_limit: 10,
        output_formats: ["markdown"],
    } satisfies CrawlRequest)

    for (const item of job.job_items) {
        const content = await item.getContent()
        console.log(content?.slice(0, 100))
    }
} catch (error) {
    if (error instanceof WebcrawlerApiError) {
        console.error("API Error:", error.errorCode, error.message)
    }
}
```

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `url` | string | Seed URL where the crawler starts |
| `items_limit` | number | Maximum number of pages to crawl |
| `output_formats` | `('markdown' \| 'cleaned' \| 'html' \| 'links')[]` | Content formats to return |
| `whitelist_regexp` | string | Only crawl URLs matching this pattern |
| `blacklist_regexp` | string | Skip URLs matching this pattern |
| `max_depth` | number | Max crawl depth from seed URL. `0` = seed only, `1` = seed + direct links |
| `main_content_only` | boolean | Strip navigation, ads, footers |
| `respect_robots_txt` | boolean | Respect the site's `robots.txt`. Default `false` |
| `max_age` | number | Max age of cached content in seconds. `0` = always fetch fresh |
| `webhook_url` | string | URL to POST results to when the job is complete |
| `actions` | Action[] | Post-processing actions (e.g. S3 upload) |

## Job Item Methods

Each `JobItem` exposes convenience methods to fetch content once the job is done:

| Method | Description |
|---|---|
| `getContent()` | Returns content in the highest-priority format (markdown > cleaned > html) |
| `getMarkdown()` | Returns markdown content |
| `getCleaned()` | Returns cleaned HTML content |
| `getHTML()` | Returns raw HTML content |

## Job Response Structure

```js
{
  id: '49c4942b-b7d9-4d62-94b5-b54a3016ac51',
  url: 'https://stripe.com/',
  output_formats: ['markdown'],
  items_limit: 10,
  status: 'in_progress',
  recommended_pull_delay_ms: 5000,
  created_at: '2024-12-28T21:36:04.417Z',
  finished_at: null,
  job_items: [
    {
      id: 'f26cefe1-09d1-4d4c-8b74-b65e075e230d',
      job_id: '49c4942a-b7d9-4d62-94b5-b54a3016ac51',
      original_url: 'https://stripe.com/',
      status: 'new',
      title: '',
      page_status_code: 0,
      cost: 0,
      markdown_content_url: 'https://...',
    }
  ]
}
```

## Error Handling

All API errors throw a `WebcrawlerApiError`:

```typescript
error.message      // Human-readable error description
error.errorCode    // Machine-readable error code (e.g. "rate_limit_exceeded")
error.statusCode   // HTTP status code
```
