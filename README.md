# JS client for WebcrawlerAPI

Official client for [WebcrawlerAPI](https://webcrawlerapi.com/). This SDK provides a robust and type-safe way to interact with WebcrawlerAPI's powerful web scraping capabilities, making it easy to extract structured data from any website.

WebcrawlerAPI allows you to extract data from any website with just a simple API call. The service handles all the complexities of web scraping, including JavaScript rendering, proxy rotation, and rate limiting, so you can focus on using the data.

## Preparation
1. Register to [dashboard|https://dash.webcrawlerapi.com/].
2. Get an [Access Key](https://dash.webcrawlerapi.com/access).

Our dashboard provides comprehensive analytics and monitoring tools to help you track your API usage and optimize your scraping operations.

## Installation
Install WebcrawlerAPI js package:

`npm i webcrawlerapi-js`

The package is regularly updated with new features and improvements to ensure the best possible scraping experience.

## JavaScript Examples

### Synchronous Job
In this mode, the promise will be resolved when all data is ready. Synchronous jobs are perfect for quick scraping tasks where you need immediate results and don't want to handle polling logic.

```javascript
import webcrawlerapi from "webcrawlerapi-js"

async function main() {
    const client = new WebcrawlerClient(
        "YOUR API ACCESS KEY HERE",
    )

    try {
        const syncJob = await client.crawl({
            "items_limit": 10,
            "url": "https://stripe.com/",
            "scrape_type": "markdown"
        })
        
        for (const item of syncJob.job_items) {
            const content = await item.getContent()
            console.log(content.slice(0, 100))
        }
        console.log(syncJob)
        
    } catch (error) {
        if (error instanceof webcrawlerapi.WebcrawlerApiError) {
            console.error("Webcrawler error:", error.message)
        }
        return
    }
}

main().catch(console.error)
```

### Asynchronous Job
In this mode, you get a job ID immediately and can poll for results. Asynchronous jobs are ideal for large-scale scraping operations where you want to process data in batches or handle long-running tasks efficiently.

```javascript
import webcrawlerapi from "webcrawlerapi-js"

async function main() {
    const client = new WebcrawlerClient(
        "YOUR API ACCESS KEY HERE",
    )

    try {
        // Get job ID immediately
        const jobWithId = await client.crawlAsync({
            "items_limit": 10,
            "url": "https://stripe.com/",
            "scrape_type": "markdown"
        })
        
        // Poll for job completion
        const jobId = jobWithId.id
        let asyncJob = await client.getJob(jobId)
        
        // Check job status
        console.log("Job status:", asyncJob.status)
        
        // Once complete, access results
        if (asyncJob.status === "completed") {
            for (const item of asyncJob.job_items) {
                const content = await item.getContent()
                console.log(content.slice(0, 100))
            }
        }
    } catch (error) {
        if (error instanceof webcrawlerapi.WebcrawlerApiError) {
            console.error("Webcrawler error:", error.message)
        }
    }
}

main().catch(console.error)
```

## TypeScript Usage

The SDK provides full TypeScript support with type safety and error handling. Our TypeScript integration ensures you catch potential issues at compile-time and provides excellent IDE support with autocompletion and inline documentation.

```typescript
import { WebcrawlerClient, WebcrawlerApiError } from "webcrawlerapi-js"

async function main() {
    const client = new WebcrawlerClient(
        "YOUR_API_KEY",
        // Optional base URL, defaults to production API
        "http://localhost:8080" 
    )

    try {
        // Basic crawl with markdown
        const syncJob = await client.crawl({
            "items_limit": 2,
            "url": "https://books.toscrape.com/",
            "scrape_type": "markdown"
        })

        // Type-safe status check
        if (syncJob.status === "done") {
            for (const item of syncJob.job_items) {
                if (item.markdown_content_url) {
                    // Access typed properties
                    console.log("Status code:", item.page_status_code)
                    console.log("Content URL:", item.markdown_content_url)
                }
            }
        }

        // Using specialized scraper
        const scrapeJob = await client.scrape({
            "crawler_id": "webcrawler/url-to-md",
            "input": {
                "url": "https://books.toscrape.com/"
            }
        })

        if (scrapeJob.status === "done") {
            const content = scrapeJob.getContent()
            console.log("Scraped content:", content)
        }

    } catch (error) {
        // Type-safe error handling
        if (error instanceof WebcrawlerApiError) {
            console.error("API Error:", error.errorCode, error.message)
            // errorCode is typed and can be used for specific error handling
            if (error.errorCode === "invalid_request") {
                // Handle invalid request
            }
        }
    }
}

main().catch(console.error)
```

### Error Handling

The SDK provides typed error handling through the `WebcrawlerApiError` class. Our error handling system is designed to provide detailed, actionable feedback that helps you quickly identify and resolve issues in your scraping pipeline.

```typescript
try {
    const syncJob = await client.crawl({
        "items_limit": 2,
        "url": "https://books.toscrape.com/",
        // This will cause an error due to missing scrape_type
    })
} catch (error) {
    if (error instanceof WebcrawlerApiError) {
        // Typed error properties
        console.error("Error code:", error.errorCode)
        console.error("Error message:", error.message)
    }
}
```

## Response Structure

Example of a job response. The response structure is carefully designed to provide comprehensive information about your scraping job, including detailed status updates, timing information, and resource usage metrics.

```json
{
  id: '49c4942b-b7d9-4d62-94b5-b54a3016ac51',
  url: 'https://stripe.com/',
  scrape_type: 'markdown',
  whitelist_regexp: '',
  blacklist_regexp: '',
  allow_subdomains: false,
  items_limit: 10,
  created_at: '2024-12-28T21:36:04.417Z',
  finished_at: null,
  updated_at: '2024-12-28T21:36:04.383Z',
  webhook_url: '',
  status: 'in_progress',
  job_items: [
    {
      id: 'f26cefe1-09d1-4d4c-8b74-b65e075e230d',
      job_id: '49c4942a-b7d9-4d62-94b5-b54a3016ac51',
      original_url: 'https://stripe.com/',
      page_status_code: 0,
      status: 'new',
      title: '',
      last_error: '',
      error_code: '',
      created_at: '2024-12-28T21:36:04.468Z',
      updated_at: '2024-12-28T21:36:04.435Z',
      cost: 0,
      referred_url: ''
    }
  ],
  recommended_pull_delay_ms: 5000
}
```