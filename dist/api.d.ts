import { CrawlRequest, Job, JobId, ScrapeRequest, ScrapeResponse } from "./model";
export declare class WebcrawlerClient {
    protected apiVersion: string;
    protected apiKey: string;
    protected basePath: string;
    constructor(apiKey: string, basePath?: string, apiVersion?: string);
    scrapeAsync(scrapeRequest: ScrapeRequest): Promise<JobId>;
    scrapeWithMeta(scrapeRequest: ScrapeRequest): Promise<ScrapeResponse>;
    scrape(scrapeRequest: ScrapeRequest): Promise<ScrapeResponse>;
    getScrapeResult(scrapeID: string): Promise<ScrapeResponse>;
    crawl(crawlRequest: CrawlRequest): Promise<Job>;
    crawlAsync(crawlRequest: CrawlRequest): Promise<JobId>;
    getJob(jobID: string): Promise<Job>;
    private sendRequest;
}
