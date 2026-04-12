# Scraping

Single-page scraping via the v2 API.

## Synchronous (waits for result)

```javascript
import webcrawlerapi from "webcrawlerapi-js"

const client = new webcrawlerapi.WebcrawlerClient("YOUR_API_KEY")

const result = await client.scrape({
    url: "https://books.toscrape.com/",
    output_formats: ["markdown"],
})

console.log(result.markdown)
```

## Asynchronous (fire and poll)

```javascript
import webcrawlerapi from "webcrawlerapi-js"

const client = new webcrawlerapi.WebcrawlerClient("YOUR_API_KEY")

const { id } = await client.scrapeAsync({
    url: "https://books.toscrape.com/",
    output_formats: ["markdown"],
})

let result = await client.getScrape(id)
while (result.status !== "done" && result.status !== "error") {
    await new Promise(resolve => setTimeout(resolve, 2000))
    result = await client.getScrape(id)
}

console.log(result.markdown)
```

## AI Extraction

Use `prompt` to extract specific information and `response_schema` to enforce a typed JSON response.

```javascript
const result = await client.scrape({
    url: "https://books.toscrape.com/",
    output_formats: ["markdown"],
    prompt: "Extract the list of books with their titles and prices",
    response_schema: {
        type: "object",
        properties: {
            books: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        price: { type: "string" }
                    },
                    required: ["title", "price"]
                }
            }
        }
    }
})

console.log(result.structured_data)
```

## TypeScript

```typescript
import { WebcrawlerClient, WebcrawlerApiError, ScrapeRequest } from "webcrawlerapi-js"

const client = new WebcrawlerClient("YOUR_API_KEY")

try {
    const result = await client.scrape({
        url: "https://books.toscrape.com/",
        output_formats: ["markdown"],
        main_content_only: true,
    } satisfies ScrapeRequest)

    console.log(result.markdown)
} catch (error) {
    if (error instanceof WebcrawlerApiError) {
        console.error("API Error:", error.errorCode, error.message)
    }
}
```

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `url` | string | Page URL to scrape |
| `output_formats` | `('markdown' \| 'cleaned' \| 'html' \| 'links')[]` | Content formats to return |
| `prompt` | string | AI prompt to extract or transform content (extra cost) |
| `response_schema` | object | JSON schema for structured AI output (use with `prompt`) |
| `main_content_only` | boolean | Strip navigation, ads, footers — best for articles/blog posts |
| `max_age` | number | Max age of cached content in seconds. `0` = always fetch fresh |
| `clean_selectors` | string | CSS selectors to remove from the output |
| `webhook_url` | string | URL to POST results to when the scrape is complete |
| `actions` | Action[] | Post-processing actions (e.g. S3 upload) |

## Response Fields

| Field | Description |
|---|---|
| `success` | Whether the scrape succeeded |
| `status` | `"done"` or `"error"` |
| `markdown` | Markdown content (when `output_formats` includes `"markdown"`) |
| `cleaned_content` | Cleaned HTML (when `output_formats` includes `"cleaned"`) |
| `raw_content` | Raw HTML (when `output_formats` includes `"html"`) |
| `links` | Discovered links (when `output_formats` includes `"links"`) |
| `structured_data` | AI-structured response (when `prompt` + `response_schema` used) |
| `page_status_code` | HTTP status code of the scraped page |
| `page_title` | Title of the scraped page |
