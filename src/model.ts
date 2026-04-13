export interface ScrapeRequest {
    url: string;
    /** @deprecated Use output_formats instead */
    output_format?: string;
    output_formats?: ('markdown' | 'cleaned' | 'html' | 'links')[];
    webhook_url?: string;
    /** CSS selectors to clean from the output. */
    clean_selectors?: string;
    actions?: Action[];
    /** A prompt to run on the scraped content, used to extract specific information or format the output (extra cost will be charged). */
    prompt?: string;
    /** JSON schema to enforce structured output when using a prompt. Follows the OpenAI Structured Outputs format. */
    response_schema?: Record<string, any>;
    /** Extract only the main content of the page. Works best for articles, blog posts, news. */
    main_content_only?: boolean;
    /** Maximum age of cached content in seconds. Set to 0 to always fetch fresh content. */
    max_age?: number;
}

export interface ScrapeId {
    id: string;
}

export interface ScrapeResponse {
    success: boolean;
    status?: string;
    markdown?: string;
    cleaned_content?: string;
    raw_content?: string;
    page_status_code: number;
    page_title?: string;
    structured_data?: any;
    links?: string[];
}

export interface ScrapeResponseError {
    success: boolean;
    error_code: string;
    error_message: string;
    status?: string;
}

export interface JobId {
    id: string;
}

export interface CrawlRequest {
    /** The seed URL where the crawler starts. Can be any valid URL. */
    url?: string;
    /** The crawler will stop when it reaches this limit of pages for this job. */
    items_limit?: number;
    /** @deprecated Use output_formats instead */
    scrape_type?: string;
    output_formats?: ('links' | 'markdown' | 'cleaned' | 'html')[];
    /** Regular expression to whitelist URLs. Only URLs that match the pattern will be crawled. */
    whitelist_regexp?: string;
    /** Regular expression to blacklist URLs. URLs that match the pattern will be skipped. */
    blacklist_regexp?: string;
    /** URL where the server will send a POST request once the job is completed. */
    webhook_url?: string;
    actions?: Action[];
    /** If true, the crawler will respect the website's robots.txt and skip disallowed pages. Default is false. */
    respect_robots_txt?: boolean;
    /** Extract only the main content of the page. Works best for articles, blog posts, news. */
    main_content_only?: boolean;
    /** Maximum crawl depth from the starting URL. 0 = starting page only, 1 = starting page + directly linked pages, etc. No limit by default. */
    max_depth?: number;
    /** Maximum age of cached content in seconds. Set to 0 to always fetch fresh content. */
    max_age?: number;
}

export interface Job {
    id: string;
    org_id: string;
    url: string;
    status: string;
    /** @deprecated Use output_formats instead */
    scrape_type?: string;
    output_formats?: string[]
    whitelist_regexp: string;
    blacklist_regexp: string;
    items_limit: number;
    max_depth?: number;
    created_at: string;
    finished_at: string;
    updated_at: string;
    webhook_url: string;
    recommended_pull_delay_ms: number;
    job_items: JobItem[];
}

export interface JobItem {
    id: string;
    job_id: string;
    original_url: string;
    page_status_code: number;
    markdown_content_url: string;
    status: string;
    title: string;
    last_error: string;
    created_at: string;
    updated_at: string;
    cost: number;
    referred_url: string;
    link?: string;
    depth?: number;
    raw_content_url?: string;
    cleaned_content_url?: string;
    error_code?: string;
    getContent(): Promise<string | null>;
    getMarkdown(): Promise<string | null>;
    getCleaned(): Promise<string | null>;
    getHTML(): Promise<string | null>;
}

export interface Action {
    type: string;
}

export interface UploadS3Action extends Action {
    type: 'upload_s3';
    path: string;
    access_key_id: string;
    secret_access_key: string;
    bucket: string;
    endpoint?: string;
}

export interface JobMarkdownResponse {
    content_url: string;
}