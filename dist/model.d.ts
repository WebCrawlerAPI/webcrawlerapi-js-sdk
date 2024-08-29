export interface ScrapeRequest {
    input: any;
    crawler_id: string;
    max_retries?: number;
    debug?: boolean;
}
export interface ScrapeIDResponse {
    id: string;
}
export interface ScrapeResponse {
    id: string;
    url: string;
    status: any;
    page_status_code: number;
    created_at: string;
    structured_data: any;
    recommended_pull_delay_ms: number;
}
