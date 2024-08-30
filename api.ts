import {ScrapeIDResponse, ScrapeRequest, ScrapeResponse} from "./model";

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

    public async scrapeAsync(scrapeRequest: ScrapeRequest): Promise<ScrapeIDResponse> {
        const url = `${this.basePath}/${this.apiVersion}/scrape`;

        const requestOptions = {
            'method': 'POST',
            'headers': {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
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

    public async scrapeWithMeta(scrapeRequest: ScrapeRequest): Promise<ScrapeResponse> {
        const url = `${this.basePath}/${this.apiVersion}/scrape`;

        const requestOptions = {
            'method': 'POST',
            'headers': {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            'body': JSON.stringify(scrapeRequest),
        };

        const scrapeIDResponse: ScrapeIDResponse = await this.sendRequest(url, requestOptions);

        if (scrapeIDResponse.id === '') {
            throw new Error("Failed to fetch job status");
        }

        let delayIntervalMs = initialPullDelayMs;
        for (let i = 0; i < MaxPullRetries; i++) {
            await new Promise(resolve => setTimeout(resolve, delayIntervalMs));
            const scrapeResult = await this.getScrapeResult(scrapeIDResponse.id);
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
        throw new Error("Scraping took too long, please retry");
    }

    public async scrape(scrapeRequest: ScrapeRequest): Promise<ScrapeResponse> {
        const scrapeResult = await this.scrapeWithMeta(scrapeRequest);
        return scrapeResult.structured_data;
    }

    public async getScrapeResult(scrapeID: string): Promise<ScrapeResponse> {
        const url = `${this.basePath}/${this.apiVersion}/scrape/${scrapeID}`;
        const requestOptions = {
            'method': 'GET',
            'headers': {
                'Authorization': `Bearer ${this.apiKey}`,
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



