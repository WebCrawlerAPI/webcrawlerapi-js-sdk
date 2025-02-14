# JS client for WebcrawlerAPI

Official client for [WebcrawlerAPI](https://webcrawlerapi.com/).

WebcrawlerAPI allows you to extract data from any website with just a simple API call.

## Preparation
1. Register to [dashboard|https://dash.webcrawlerapi.com/].
2. Get an [Access Key](https://dash.webcrawlerapi.com/access).

## Installation
Install WebcrawlerAPI js package:

`npm i webcrawlerapi-js`

## Request example

```javascript
import { WebcrawlerClient } from "webcrawlerapi-js"

async function main() {
    const client = new WebcrawlerClient(
        "YOUR API ACCESS KEY HERE",
    )
    // sync way - promise will be resolved with the all the data
    const syncJob = await client.crawl({
            "items_limit": 10,
            "url": "https://stripe.com/",
            "scrape_type": "markdown"
        }
    )
    for (const item of syncJob.job_items) {
        item.getContent().then((content) => {
            console.log(content.slice(0, 100));
        })
    }
    console.log(syncJob);

    // or async - get the job id and then poll the job status and get the data

    const jobWithId = await client.crawlAsync({
            "items_limit": 10,
            "url": "https://stripe.com/",
            "scrape_type": "markdown"
        }
    )
    // wait for job to complete
    const jobId = jobWithId.id;
    let asyncJob = await client.getJob(jobId);

    console.log(asyncJob);
}

main().catch(console.error);
```

## Response example
```javascript
{
  id: '49c4942b-b7d9-4d62-94b5-b54a3016ac51',
  org_id: 'clxsnorta00075wuuqxgzzvxm',
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
      created_at: '2024-12-28T21:36:04.468Z',
      updated_at: '2024-12-28T21:36:04.435Z',
      cost: 0,
      referred_url: ''
    }
  ],
  recommended_pull_delay_ms: 5000
}
```