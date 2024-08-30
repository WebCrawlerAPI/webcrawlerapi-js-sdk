import { ScrapeIDResponse, ScrapeRequest, ScrapeResponse } from "./model";
export declare class WebcrawlerClient {
    protected apiVersion: string;
    protected apiKey: string;
    protected basePath: string;
    constructor(apiKey: string, basePath?: string, apiVersion?: string);
    scrapeAsync(scrapeRequest: ScrapeRequest): Promise<ScrapeIDResponse>;
    scrapeWithMeta(scrapeRequest: ScrapeRequest): Promise<ScrapeResponse>;
    scrape(scrapeRequest: ScrapeRequest): Promise<ScrapeResponse>;
    getScrapeResult(scrapeID: string): Promise<ScrapeResponse>;
    private sendRequest;
}
