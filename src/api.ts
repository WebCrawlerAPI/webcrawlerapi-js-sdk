import {CrawlRequest, Job, JobId, ScrapeRequest, ScrapeResponse, ScrapeResponseError, ScrapeId, Action, JobItem} from "./model";
import { JobStatus, ErrorCode } from "./constants";
import { WebcrawlerApiError, createErrorFromResponse, ErrorResponse } from "./errors";

const BASE_PATH = "https://api.webcrawlerapi.com"
const initialPullDelayMs = 2000
const MaxPullRetries = 100
const DEFAULT_POLL_DELAY_SECONDS = 2

export { WebcrawlerApiError, JobStatus, ErrorCode };
export * from "./model";

const SCRAPE_VERSION = "v2"


function addGetContentMethod(job: Job): Job {
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

export class WebcrawlerClient {
    protected apiVersion: string = "v1";
    protected apiKey: string
    protected basePath: string

    constructor(apiKey: string, basePath: string = BASE_PATH, apiVersion: string = "v1") {
        this.apiKey = apiKey ;
        this.basePath = basePath;
        this.apiVersion = apiVersion;
    }

    public async scrapeAsync(
        request: ScrapeRequest
    ): Promise<ScrapeId> {
        const apiUrl = `${this.basePath}/${SCRAPE_VERSION}/scrape?async=true`;
        const requestOptions = {
            'method': 'POST',
            'headers': {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                "User-Agent": "WebcrawlerAPI-NodeJS-Client"
            },
            'body': JSON.stringify(request),
        };

        const response = await this.sendRequest(apiUrl, requestOptions);
        return { id: response.id };
    }

    public async getScrape(scrapeId: string): Promise<ScrapeResponse | ScrapeResponseError> {
        const url = `${this.basePath}/${SCRAPE_VERSION}/scrape/${scrapeId}`;
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

        const responseData = await this.sendRequest(url, requestOptions);
        const status = responseData.status;

        if (status === "done") {
            return responseData;
        } else if (status === "error") {
            return responseData;
        } else {
            // in_progress or any other status
            return {
                success: false,
                status: status,
                page_status_code: 0
            };
        }
    }

    public async scrape(
        request: ScrapeRequest,
        maxPolls: number = 100
    ): Promise<ScrapeResponse | ScrapeResponseError> {
        // Start the scraping job
        const scrapeIdResponse = await this.scrapeAsync(request);

        const scrapeId = scrapeIdResponse.id;
        let polls = 0;
        let result: ScrapeResponse | ScrapeResponseError;

        while (polls < maxPolls) {
            result = await this.getScrape(scrapeId);

            // Return immediately if scrape is done
            if ('status' in result && result.status === "done") {
                return result;
            }

            // Return immediately if there's an error
            if ('error_code' in result) {
                return result;
            }

            // Continue polling if status is in_progress or any other non-terminal status
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, DEFAULT_POLL_DELAY_SECONDS * 1000));
            polls++;
        }

        // Return the last known state if maxPolls is reached
        return result!;
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
        const job = await this.sendRequest(url, requestOptions);
        return addGetContentMethod(job);
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



