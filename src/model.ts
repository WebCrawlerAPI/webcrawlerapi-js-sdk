export interface ScrapeRequest {
    url: string;
    output_format?: string;
    webhook_url?: string;
    clean_selectors?: string;
    actions?: Action[];
    prompt?: string;
    respect_robots_txt?: boolean;
    main_content_only?: boolean;
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
    url?: string;
    crawler_id?: string;
    items_limit?: number;
    scrape_type?: string;
    whitelist_regexp?: string;
    blacklist_regexp?: string;
    allow_subdomains?: boolean;
    webhook_url?: string;
    actions?: Action[];
    respect_robots_txt?: boolean;
    main_content_only?: boolean;
    max_depth?: number;
}

export interface Job {
    id: string;
    org_id: string;
    url: string;
    status: string;
    scrape_type: string;
    whitelist_regexp: string;
    blacklist_regexp: string;
    allow_subdomains: boolean;
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
    depth?: number;
    raw_content_url?: string;
    cleaned_content_url?: string;
    getContent(): Promise<string | null>;
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