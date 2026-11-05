import {CrawlRequest, Job, JobId, ScrapeRequest, ScrapeResponse, ScrapeResponseError, ScrapeId, JobMarkdownResponse, MarkdownRequest, MarkdownResponse, AgentRunRequest, AgentRun, AgentRunList, BatchScrapeRequest, BatchScrapeId, BatchScrape, BatchScrapeGetOptions, BatchScrapeErrors, ScrapeBatchRequest} from "./model";
import { JobStatus, ErrorCode } from "./constants";
import { WebcrawlerApiError, createErrorFromResponse, ErrorResponse } from "./errors";

const BASE_PATH = "https://api.webcrawlerapi.com"
const initialPullDelayMs = 2000
const MaxPullRetries = 100
const DEFAULT_POLL_DELAY_SECONDS = 2
const SCRAPE_MAX_WAIT_MS = 400 * 1000
// Effectively unbounded by count at the 2s default; elapsed time is the real limit
const SCRAPE_MAX_POLLS = 1000
const BATCH_VERSION = "v2"
const BATCH_MAX_WAIT_MS = 3600 * 1000
const BatchTerminalStatuses = ["completed", "failed", "cancelled", "canceled"]
const AgentTerminalStatuses = ["done", "error", "canceled"]

export { WebcrawlerApiError, JobStatus, ErrorCode };
export * from "./model";

const SCRAPE_VERSION = "v2"


function resolveContentUrl(job: Job, item: { raw_content_url?: string; cleaned_content_url?: string; markdown_content_url?: string }): string | undefined {
    // Prefer output_formats if present and non-empty, using priority: markdown > cleaned > html
    if (Array.isArray(job.output_formats) && job.output_formats.length > 0) {
        const priority = ['markdown', 'cleaned', 'html'] as const;
        for (const fmt of priority) {
            if (job.output_formats.includes(fmt)) {
                switch (fmt) {
                    case 'markdown': return item.markdown_content_url;
                    case 'cleaned':  return item.cleaned_content_url;
                    case 'html':     return item.raw_content_url;
                }
            }
        }
        return undefined;
    }

    // Fall back to scrape_type for backward compatibility
    switch (job.scrape_type) {
        case 'html':     return item.raw_content_url;
        case 'cleaned':  return item.cleaned_content_url;
        case 'markdown': return item.markdown_content_url;
        default:         return undefined;
    }
}

async function fetchContentUrl(url: string | undefined): Promise<string | null> {
    if (!url) {
        return null;
    }
    const response = await fetch(url, {
        headers: {
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': '*/*'
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.statusText}`);
    }
    return response.text();
}

function addGetContentMethod(job: Job): Job {
    // Transform each job item to include getContent method
    job.job_items = job.job_items.map(item => ({
        ...item,
        getContent: async function(): Promise<string | null> {
            if (job.status !== JobStatus.DONE || this.status !== JobStatus.DONE) {
                return null;
            }
            const contentUrl = resolveContentUrl(job, this);
            return fetchContentUrl(contentUrl);
        },
        getMarkdown: async function(): Promise<string | null> {
            return fetchContentUrl(this.markdown_content_url);
        },
        getCleaned: async function(): Promise<string | null> {
            return fetchContentUrl(this.cleaned_content_url);
        },
        getHTML: async function(): Promise<string | null> {
            return fetchContentUrl(this.raw_content_url);
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

    private getDefaultHeaders(cacheControl: boolean = false): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            "User-Agent": "WebcrawlerAPI-NodeJS-Client"
        };

        if (cacheControl) {
            headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
            headers['Pragma'] = 'no-cache';
            headers['Expires'] = '0';
        }

        return headers;
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

    public async runAgentAsync(request: AgentRunRequest): Promise<AgentRun> {
        const url = `${this.basePath}/${this.apiVersion}/agent`;
        const requestOptions = {
            'method': 'POST',
            'headers': this.getDefaultHeaders(),
            'body': JSON.stringify(request),
        };

        return await this.sendRequest(url, requestOptions);
    }

    public async getAgentJob(jobID: string): Promise<AgentRun> {
        const url = `${this.basePath}/${this.apiVersion}/agent/job/${jobID}`;
        const requestOptions = {
            'method': 'GET',
            'headers': this.getDefaultHeaders(true)
        };

        return await this.sendRequest(url, requestOptions);
    }

    public async runAgent(
        request: AgentRunRequest,
        maxPolls: number = MaxPullRetries
    ): Promise<AgentRun> {
        const run = await this.runAgentAsync(request);

        if (!run.id) {
            throw new WebcrawlerApiError('invalid_response', 'Failed to fetch agent job status', 0);
        }

        if (AgentTerminalStatuses.includes(run.status)) {
            return run;
        }

        for (let i = 0; i < maxPolls; i++) {
            await new Promise(resolve => setTimeout(resolve, DEFAULT_POLL_DELAY_SECONDS * 1000));
            const timestamp = new Date().getTime();
            const agentJob = await this.getAgentJob(`${run.id}?t=${timestamp}`);

            if (AgentTerminalStatuses.includes(agentJob.status)) {
                return agentJob;
            }
        }

        throw new WebcrawlerApiError('timeout', 'Agent run took too long, please retry or increase the number of polling retries', 0);
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
                page_status_code: 0,
                recommended_pull_delay_ms: responseData.recommended_pull_delay_ms
            };
        }
    }

    /**
     * Scrapes a single URL and waits for the result.
     *
     * Passing `url` as an array creates a batch scrape instead, polls until it reaches a
     * terminal status (completed, failed or cancelled) and returns the first page of items;
     * follow `next` with getBatch(id, { cursor }) for larger batches. Batch-only options
     * (max_concurrency, ignore_invalid_urls, ...) go in the same request object. A batch throws a
     * `timeout` error if it does not finish within an hour or maxPolls.
     * For manual batch control use scrapeBatchAsync() + getBatch().
     */
    public async scrape(request: ScrapeRequest, maxPolls?: number): Promise<ScrapeResponse | ScrapeResponseError>;
    public async scrape(request: ScrapeBatchRequest, maxPolls?: number): Promise<BatchScrape>;
    public async scrape(
        request: ScrapeRequest | ScrapeBatchRequest,
        maxPolls: number = SCRAPE_MAX_POLLS
    ): Promise<ScrapeResponse | ScrapeResponseError | BatchScrape> {
        if (Array.isArray(request.url)) {
            const { url, ...options } = request;
            return await this.scrapeBatchAndWait({ ...options, urls: url }, maxPolls);
        }
        return await this.scrapeSingle(request as ScrapeRequest, maxPolls);
    }

    private async scrapeSingle(
        request: ScrapeRequest,
        maxPolls: number
    ): Promise<ScrapeResponse | ScrapeResponseError> {
        // Start the scraping job
        const scrapeIdResponse = await this.scrapeAsync(request);

        const scrapeId = scrapeIdResponse.id;
        const startedAt = Date.now();
        let polls = 0;
        let delayMs = DEFAULT_POLL_DELAY_SECONDS * 1000;
        let result: ScrapeResponse | ScrapeResponseError;

        // Bounded by both elapsed time (SCRAPE_MAX_WAIT_MS) and maxPolls
        while (polls < maxPolls && Date.now() - startedAt < SCRAPE_MAX_WAIT_MS) {
            result = await this.getScrape(scrapeId);

            // Return immediately if scrape is done
            if ('status' in result && result.status === "done") {
                return result;
            }

            // Return immediately if there's an error
            if ('error_code' in result) {
                return result;
            }

            // Use server-recommended delay when present, otherwise keep the default
            const recommended = (result as ScrapeResponse).recommended_pull_delay_ms;
            delayMs = recommended && recommended > 0 ? recommended : DEFAULT_POLL_DELAY_SECONDS * 1000;

            // Don't sleep past the overall deadline
            const remainingMs = SCRAPE_MAX_WAIT_MS - (Date.now() - startedAt);
            if (remainingMs <= 0) break;
            await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, remainingMs)));
            polls++;
        }

        // Return the last known state on timeout
        return result!;
    }

    public async scrapeBatchAsync(request: BatchScrapeRequest): Promise<BatchScrapeId> {
        const url = `${this.basePath}/${BATCH_VERSION}/batch/scrape`;
        const requestOptions = {
            'method': 'POST',
            'headers': this.getDefaultHeaders(),
            'body': JSON.stringify(request),
        };
        return await this.sendRequest(url, requestOptions);
    }

    public async getBatch(batchId: string, options: BatchScrapeGetOptions = {}): Promise<BatchScrape> {
        const params = new URLSearchParams();
        if (options.limit !== undefined) params.set('limit', String(options.limit));
        if (options.cursor) params.set('cursor', options.cursor);
        const query = params.toString();
        const url = `${this.basePath}/${BATCH_VERSION}/batch/scrape/${batchId}${query ? `?${query}` : ''}`;
        const requestOptions = {
            'method': 'GET',
            'headers': this.getDefaultHeaders(true),
        };
        return await this.sendRequest(url, requestOptions);
    }

    public async getBatchErrors(batchId: string): Promise<BatchScrapeErrors> {
        const url = `${this.basePath}/${BATCH_VERSION}/batch/scrape/${batchId}/errors`;
        const requestOptions = {
            'method': 'GET',
            'headers': this.getDefaultHeaders(true),
        };
        return await this.sendRequest(url, requestOptions);
    }

    public async cancelBatch(batchId: string): Promise<{ status: string }> {
        const url = `${this.basePath}/${BATCH_VERSION}/batch/scrape/${batchId}`;
        const requestOptions = {
            'method': 'DELETE',
            'headers': this.getDefaultHeaders(),
        };
        return await this.sendRequest(url, requestOptions);
    }

    private async scrapeBatchAndWait(request: BatchScrapeRequest, maxPolls: number): Promise<BatchScrape> {
        const created = await this.scrapeBatchAsync(request);
        if (!created.id) {
            throw new WebcrawlerApiError('invalid_response', 'Failed to create batch scrape', 0);
        }

        const startedAt = Date.now();
        for (let i = 0; i < maxPolls && Date.now() - startedAt < BATCH_MAX_WAIT_MS; i++) {
            const batch = await this.getBatch(created.id);
            if (BatchTerminalStatuses.includes(batch.status)) {
                return batch;
            }
            await new Promise(resolve => setTimeout(resolve, DEFAULT_POLL_DELAY_SECONDS * 1000));
        }
        throw new WebcrawlerApiError('timeout', 'Batch scrape took too long, use scrapeBatchAsync + getBatch to keep polling', 0);
    }

    public async crawl(crawlRequest: CrawlRequest, maxPolls: number = MaxPullRetries): Promise<Job> {
        const url = `${this.basePath}/${this.apiVersion}/crawl`;

        const requestBody = {
            output_formats: ['markdown'],
            ...crawlRequest
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
        for (let i = 0; i < maxPolls; i++) {
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

    public async crawlAsync(crawlRequest: CrawlRequest): Promise<JobId> {
        const url = `${this.basePath}/${this.apiVersion}/crawl`;

        const requestBody = {
            output_formats: ['markdown'],
            ...crawlRequest
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

    public async getJobMarkdown(jobID: string): Promise<JobMarkdownResponse> {
        const url = `${this.basePath}/${this.apiVersion}/job/${jobID}/markdown`;
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
        return this.sendRequest(url, requestOptions);
    }

    public async getJobMarkdownContent(jobID: string): Promise<string> {
        const url = `${this.basePath}/${this.apiVersion}/job/${jobID}/markdown/content`;
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
                throw new WebcrawlerApiError(
                    'unknown_error',
                    `Request failed with status ${response.status} ${response.statusText}`,
                    response.status
                );
            }
        }

        return response.text();
    }

    public async markdown(request: MarkdownRequest): Promise<MarkdownResponse> {
        const url = `${this.basePath}/markdown`;
        const requestOptions = {
            'method': 'POST',
            'headers': this.getDefaultHeaders(),
            'body': JSON.stringify(request),
        };

        return this.sendRequest(url, requestOptions);
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

