# Batch scrape

Scrape an explicit list of URLs in one async request. The API returns a batch `id` right away and scrapes the pages in the background. You can wait for the result with `scrape()`, or start the batch and poll it yourself.

API reference: [Batch scrape API](https://webcrawlerapi.com/docs/api/batch-scrape). Guide: [Batch scrape guide](https://webcrawlerapi.com/docs/guides/batch-scrape).

## Quick example

```javascript
import webcrawlerapi from "webcrawlerapi-js"

const client = new webcrawlerapi.WebcrawlerClient("YOUR_API_KEY")

const batch = await client.scrape({
    url: ["https://example.com/", "https://example.com/pricing", "https://example.com/blog"],
    output_formats: ["markdown"],
    max_concurrency: 5,
})

console.log(batch.status, batch.total, batch.completed, batch.failed)
for (const item of batch.data) {
    console.log(item.url, item.status, item.markdown_url)
}
```

Methods: `scrape()` (array `url`), `scrapeBatchAsync()`, `getBatch()`, `getBatchErrors()`, `cancelBatch()`.

## Request options

Shared by `scrape()` (with an array `url`) and `scrapeBatchAsync()`:

| Option | Type | Description |
| --- | --- | --- |
| `urls` / `url` | `string[]` | URLs to scrape. Max is your plan's job items limit (100 during trial). The field is `urls` for `scrapeBatchAsync()` and `url` (an array) for `scrape()`. |
| `output_formats` | `('markdown' \| 'cleaned' \| 'html' \| 'links' \| 'images')[]` | Output formats. Default `["markdown"]`. |
| `main_content_only` | `boolean` | Extract only the main content. |
| `clean_selectors` | `string` | CSS selectors to clean from the output. |
| `max_concurrency` | `number` | Max URLs scraped in parallel for this batch. `0` or omitted means no per-batch cap. |
| `ignore_invalid_urls` | `boolean` | Skip invalid URLs and report them in `invalid_urls`. Default `true`. If `false`, any invalid URL fails the request. |
| `webhook_url` | `string` | Public http(s) URL called once when the batch finishes. |
| `max_age` | `number` | Cache duration in seconds. Default `604800` (7 days). `0` bypasses the cache. |
| `respect_robots_txt` | `boolean` | Respect each website's robots.txt. |

`prompt`, `response_schema` and `actions` are not supported in batch scrape.

## scrape (array url)

```typescript
scrape(request: ScrapeBatchRequest, maxPolls?: number): Promise<BatchScrape>
```

Passing an array as `url` creates a batch, polls every 2 seconds until the batch reaches a terminal status (`completed`, `failed` or `cancelled`) and returns the first page of items (default page size, 100). A single string `url` still returns a single scrape result.

- `request`: `{ url: string[], ...options }`, options as in the table above.
- `maxPolls`: maximum number of polls. Default `1000`.
- Returns a `BatchScrape` (see below). For batches larger than one page, follow `next` with `getBatch()`.
- Throws `WebcrawlerApiError` with `errorCode: 'timeout'` if the batch does not finish within an hour or `maxPolls`. The batch keeps running on the server: use `scrapeBatchAsync()` and `getBatch()` to keep polling.
- Throws `WebcrawlerApiError` for API errors (for example 400 invalid parameters or no valid URLs, 401, 402 insufficient balance).

```javascript
const batch = await client.scrape({ url: urls, ignore_invalid_urls: true })
```

## scrapeBatchAsync

```typescript
scrapeBatchAsync(request: BatchScrapeRequest): Promise<BatchScrapeId>
```

Starts a batch and returns immediately.

- `request`: `{ urls: string[], ...options }`.
- Returns `BatchScrapeId`: `id`, `status_url` and `invalid_urls` (`{ url, error_code, error_message }[]`).
- URLs are normalized and deduplicated. Duplicates and rejected URLs come back in `invalid_urls` (for example `invalid_request`, `name_not_resolved`). A page with the same content as another page in the batch fails later as an item with `duplicate_item`; it appears in `data` and in the errors list, not in `invalid_urls`.
- Throws `WebcrawlerApiError` on API errors.

```javascript
const { id, invalid_urls } = await client.scrapeBatchAsync({
    urls: ["https://example.com/", "not a url"],
    webhook_url: "https://your-server.com/webhook",
})
```

## getBatch

```typescript
getBatch(batchId: string, options?: BatchScrapeGetOptions): Promise<BatchScrape>
```

Returns batch progress and one page of items.

- `batchId`: the `id` from `scrapeBatchAsync()`.
- `options.limit`: items per page, 1 to 500. Default 100.
- `options.cursor`: the `next` value from the previous page.
- Returns `BatchScrape`:
  - `id`, `status` (`scraping`, `completed`, `failed` or `cancelled`)
  - `total`, `completed`, `failed`, `canceled`: item counters
  - `data`: `BatchScrapeItem[]` with `url`, `status` (for example `done` or `error`), `page_status_code`, `title`, `markdown_url`, `cleaned_url`, `html_url` (only for requested formats), `from_cache`, `error_code`, `error_message`
  - `next`: cursor for the next page, empty on the last page
- Throws `WebcrawlerApiError` on API errors (404 if the batch does not exist).

### Pagination

```javascript
const items = []
let cursor
do {
    const page = await client.getBatch(id, { limit: 500, cursor })
    items.push(...page.data)
    cursor = page.next
} while (cursor)
```

### Polling

```javascript
let batch = await client.getBatch(id)
while (batch.status === "scraping") {
    await new Promise(r => setTimeout(r, 2000))
    batch = await client.getBatch(id)
}
```

## getBatchErrors

```typescript
getBatchErrors(batchId: string): Promise<BatchScrapeErrors>
```

Lists URLs that failed.

- Returns `{ errors: { url, error_code, error_message }[], robots_blocked: string[] }`. URLs blocked by robots.txt (when `respect_robots_txt` is `true`) are in `robots_blocked`.
- Failed URLs do not fail the batch. To retry them, submit them in a new batch.
- See [Errors](https://webcrawlerapi.com/docs/errors) for the error codes.

```javascript
const { errors, robots_blocked } = await client.getBatchErrors(id)
for (const e of errors) console.log(e.url, e.error_code, e.error_message)
```

## cancelBatch

```typescript
cancelBatch(batchId: string): Promise<{ status: string }>
```

Cancels a running batch. Items that did not start are marked `canceled` and are not charged. Returns `{ status: "canceled" }`. Throws `WebcrawlerApiError` with status 400 if the batch has already finished.

```javascript
await client.cancelBatch(id)
```

## Webhook or polling

- Polling: use `scrape()` (waits for you) or `getBatch()` in your own loop.
- Webhook: set `webhook_url` in `scrapeBatchAsync()`. One `POST` with the same body as `getBatch()` (first 100 items) is sent when the batch finishes. For larger batches, fetch the remaining pages with `cursor`. See [webhooks](https://webcrawlerapi.com/docs/async-requests).

## Errors

All methods throw `WebcrawlerApiError` with `errorCode`, `errorMessage` and `statusCode`. Network failures use `errorCode: 'network_error'`, and a wait that runs out uses `'timeout'`.
