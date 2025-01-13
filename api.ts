import {CrawlRequest, Job, JobId, ScrapeRequest, ScrapeResponse} from "./model";

const BASE_PATH = "https://api.webcrawlerapi.com"
const initialPullDelayMs = 2000
const MaxPullRetries = 100

export class WebcrawlerClient {
    protected apiVersion: string = "v1";
    protected apiKey: string
    protected basePath: string

    constructor(apiKey: string, basePath: string = BASE_PATH, apiVersion: string = "v1") {
        this.apiKey = apiKey ;
        this.basePath = basePath;
        this.apiVersion = apiVersion;
    }

    public async scrapeAsync(scrapeRequest: ScrapeRequest): Promise<JobId> {
        const url = `${this.basePath}/${this.apiVersion}/scrape`;

        const requestOptions = {
            'method': 'POST',
            'headers': {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                "User-Agent": "WebcrawlerAPI-NodeJS-Client"
            },
            'body': JSON.stringify(scrapeRequest),
        };

        const response = await fetch(url, requestOptions);
        if (response.ok) {
            return response.json();
        }
        try {
            const data = await response.json();
            throw new Error(
                `failed to scrape, response returned ${response.status} ${response.statusText}: ${data?.error}`
            );
        } catch (e) {
            throw e;
        }
    }

    public async scrapeWithMeta(scrapeRequest: ScrapeRequest, maxPollingRetries: number = MaxPullRetries): Promise<ScrapeResponse> {
        const url = `${this.basePath}/${this.apiVersion}/scrape`;

        const requestOptions = {
            'method': 'POST',
            'headers': {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            'body': JSON.stringify(scrapeRequest),
        };

        const jobIdResponse: JobId = await this.sendRequest(url, requestOptions);

        if (jobIdResponse.id === '') {
            throw new Error("Failed to fetch job status");
        }

        let delayIntervalMs = initialPullDelayMs;
        for (let i = 0; i < maxPollingRetries; i++) {
            await new Promise(resolve => setTimeout(resolve, delayIntervalMs));
            const scrapeResult = await this.getScrapeResult(jobIdResponse.id);
            if (scrapeRequest.debug) {
                console.log(`Scrape result: ${JSON.stringify(scrapeResult)}`);
            }
            if (scrapeResult.status !== 'in_progress' && scrapeResult.status !== 'new') {
                return scrapeResult;
            }
            if (scrapeResult.recommended_pull_delay_ms > 0) {
                delayIntervalMs = scrapeResult.recommended_pull_delay_ms;
            }
        }
        throw new Error("Scraping took too long, please retry or increase the number of polling retries");
    }

    public async scrape(scrapeRequest: ScrapeRequest, maxPollingRetries: number = MaxPullRetries): Promise<any> {
        const scrapeResult = await this.scrapeWithMeta(scrapeRequest, maxPollingRetries);
        return scrapeResult.structured_data;
    }

    public async getScrapeResult(scrapeID: string): Promise<ScrapeResponse> {
        const url = `${this.basePath}/${this.apiVersion}/scrape/${scrapeID}`;
        const requestOptions = {
            'method': 'GET',
            'headers': {
                'Authorization': `Bearer ${this.apiKey}`,
                "User-Agent": "WebcrawlerAPI-NodeJS-Client"
            },
        };
        const response = await fetch(url, requestOptions);
        if (response.ok) {
            return response.json();
        }

        try {
            const data = await response.json();
            throw new Error(
                `failed to fetch job status ${response.status} ${response.statusText}: ${JSON.stringify(data)}`
            );
        } catch (e) {
            throw new Error(
                `failed to fetch job status ${response.status} ${response.statusText}`
            );
        }
    }

    public async crawl(crawlRequest: CrawlRequest): Promise<Job> {
        const url = `${this.basePath}/${this.apiVersion}/crawl`;

        const requestOptions = {
            'method': 'POST',
            'headers': {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                "User-Agent": "WebcrawlerAPI-NodeJS-Client"
            },
            'body': JSON.stringify(crawlRequest),
        };

        const jobIdResponse: JobId = await this.sendRequest(url, requestOptions);

        if (jobIdResponse.id === '') {
            throw new Error("Failed to fetch job status");
        }

        let delayIntervalMs = initialPullDelayMs;
        for (let i = 0; i < MaxPullRetries; i++) {
            await new Promise(resolve => setTimeout(resolve, delayIntervalMs));
            const job = await this.getJob(jobIdResponse.id);
            if (job.status !== 'in_progress' && job.status !== 'new') {
                return job;
            }
            if (job.recommended_pull_delay_ms > 0) {
                delayIntervalMs = job.recommended_pull_delay_ms;
            }
        }
    }

    public async crawlAsync(crawlRequest: CrawlRequest): Promise<JobId> {
        const url = `${this.basePath}/${this.apiVersion}/crawl`;

        const requestOptions = {
            'method': 'POST',
            'headers': {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            'body': JSON.stringify(crawlRequest),
        };

        return await this.sendRequest(url, requestOptions);
    }

    public async getJob(jobID: string): Promise<Job> {
        const url = `${this.basePath}/${this.apiVersion}/job/${jobID}`;
        const requestOptions = {
            'method': 'GET',
            'headers': {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                "User-Agent": "WebcrawlerAPI-NodeJS-Client"
            }
        }
        const response = await fetch(url, requestOptions);
        if (response.ok) {
            return response.json();
        }

        try {
            const data = await response.json();
            throw new Error(
                `failed to fetch job status ${response.status} ${response.statusText}: ${JSON.stringify(data)}`
            );
        } catch (e) {
            throw new Error(
                `failed to fetch job status ${response.status} ${response.statusText}`
            );
        }
    }


    private async sendRequest(url: string, requestOptions: any): Promise<any> {
        let response: Response;
        try {
            response = await fetch(url, requestOptions);
        } catch (e) {
            throw new Error(`Failed to send request: ${e}`);
        }
        if (!response.ok) {
            const errorResponse = await response.json();
            throw new Error(`${JSON.stringify(errorResponse)}`);
        }
        return response.json();
    }
}



