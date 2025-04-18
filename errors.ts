export class WebcrawlerApiError extends Error {
    public errorCode: string;
    public errorMessage: string;
    public statusCode?: number;

    constructor(errorCode: string, errorMessage: string, statusCode?: number) {
        super(errorMessage);
        this.name = 'WebcrawlerApiError';
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
        this.statusCode = statusCode;
    }
}

export interface ErrorResponse {
    error_code?: string;
    error_message?: string;
    error?: string;
}

export function createErrorFromResponse(response: Response, data: ErrorResponse): WebcrawlerApiError {
    const errorCode = data.error_code || 'unknown_error';
    const errorMessage = data.error_message || data.error || 'Unknown error';
    return new WebcrawlerApiError(errorCode, errorMessage, response.status);
} 