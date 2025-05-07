import {CrawlRequest, Job, JobId, ScrapeRequest, ScrapeResponse, Action} from "./model";
import { JobStatus } from "./constants";
import { WebcrawlerApiError, createErrorFromResponse, ErrorResponse } from "./errors";

const BASE_PATH = "https://api.webcrawlerapi.com"
const initialPullDelayMs = 2000
const MaxPullRetries = 100

export { WebcrawlerApiError, JobStatus };
export * from "./model";

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

        return await this.sendRequest(url, requestOptions);
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
            throw new WebcrawlerApiError('invalid_response', 'Failed to fetch job status', 0);
        }

        let delayIntervalMs = initialPullDelayMs;
        for (let i = 0; i < maxPollingRetries; i++) {
            await new Promise(resolve => setTimeout(resolve, delayIntervalMs));
            const scrapeResult = await this.getScrapeResult(jobIdResponse.id);
            if (scrapeRequest.debug) {
                console.log(`Scrape result: ${JSON.stringify(scrapeResult)}`);
            }
            if (scrapeResult.status !== JobStatus.IN_PROGRESS && scrapeResult.status !== JobStatus.NEW) {
                return scrapeResult;
            }
            if (scrapeResult.recommended_pull_delay_ms > 0) {
                delayIntervalMs = scrapeResult.recommended_pull_delay_ms;
            }
        }
        throw new WebcrawlerApiError('timeout', 'Scraping took too long, please retry or increase the number of polling retries', 0);
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
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                "User-Agent": "WebcrawlerAPI-NodeJS-Client",
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
        };
        return await this.sendRequest(url, requestOptions);
    }

    public async crawl(crawlRequest: CrawlRequest, actions?: Action | Action[]): Promise<Job> {
        const url = `${this.basePath}/${this.apiVersion}/crawl`;

        const requestBody = {
            ...crawlRequest,
            actions: actions ? (Array.isArray(actions) ? actions : [actions]) : undefined
        };

        const requestOptions = {
            'method': 'POST',
            'headers': {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                "User-Agent": "WebcrawlerAPI-NodeJS-Client",
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            'body': JSON.stringify(requestBody),
        };

        const jobIdResponse: JobId = await this.sendRequest(url, requestOptions);

        if (jobIdResponse.id === '') {
            throw new WebcrawlerApiError('invalid_response', 'Failed to fetch job status', 0);
        }

        let delayIntervalMs = initialPullDelayMs;
        for (let i = 0; i < MaxPullRetries; i++) {
            await new Promise(resolve => setTimeout(resolve, delayIntervalMs));
            const timestamp = new Date().getTime();
            const job = await this.getJob(`${jobIdResponse.id}?t=${timestamp}`);
            if (job.status !== JobStatus.IN_PROGRESS && job.status !== JobStatus.NEW) {
                // Transform each job item to include getContent method
                job.job_items = job.job_items.map(item => ({
                    ...item,
                    getContent: async function(): Promise<string | null> {
                        if (job.status !== JobStatus.DONE || this.status !== JobStatus.DONE) {
                            return null;
                        }

                        let contentUrl: string | undefined;
                        switch (job.scrape_type) {
                            case 'html':
                                contentUrl = this.raw_content_url;
                                break;
                            case 'cleaned':
                                contentUrl = this.cleaned_content_url;
                                break;
                            case 'markdown':
                                contentUrl = this.markdown_content_url;
                                break;
                        }

                        if (!contentUrl) {
                            return null;
                        }

                        const response = await fetch(contentUrl, {
                            headers: {
                                'Accept-Encoding': 'gzip, deflate, br',
                                'Accept': '*/*'
                            }
                        });

                        if (!response.ok) {
                            throw new Error(`Failed to fetch content: ${response.statusText}`);
                        }

                        return await response.text();
                    }
                }));
                return job;
            }
            if (job.recommended_pull_delay_ms > 0) {
                delayIntervalMs = job.recommended_pull_delay_ms;
            }
        }
        throw new WebcrawlerApiError('timeout', 'Crawling took too long, please retry or increase the number of polling retries', 0);
    }

    public async crawlAsync(crawlRequest: CrawlRequest, actions?: Action | Action[]): Promise<JobId> {
        const url = `${this.basePath}/${this.apiVersion}/crawl`;

        const requestBody = {
            ...crawlRequest,
            actions: actions ? (Array.isArray(actions) ? actions : [actions]) : undefined
        };

        const requestOptions = {
            'method': 'POST',
            'headers': {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            'body': JSON.stringify(requestBody),
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
                "User-Agent": "WebcrawlerAPI-NodeJS-Client",
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        };
        return await this.sendRequest(url, requestOptions);
    }

    private async sendRequest(url: string, requestOptions: any): Promise<any> {
        let response: Response;
        try {
            response = await fetch(url, requestOptions);
        } catch (e) {
            throw new WebcrawlerApiError('network_error', `Failed to send request: ${e}`, 0);
        }

        if (!response.ok) {
            try {
                const errorData = await response.json() as ErrorResponse;
                throw createErrorFromResponse(response, errorData);
            } catch (e) {
                if (e instanceof WebcrawlerApiError) {
                    throw e;
                }
                // If we can't parse the error response, create a generic error
                throw new WebcrawlerApiError(
                    'unknown_error',
                    `Request failed with status ${response.status} ${response.statusText}`,
                    response.status
                );
            }
        }

        return response.json();
    }
}



