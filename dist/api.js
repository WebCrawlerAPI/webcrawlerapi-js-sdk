"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebcrawlerClient = void 0;
const BASE_PATH = "https://api.webcrawlerapi.com";
const initialPullDelayMs = 2000;
const MaxPullRetries = 100;
class WebcrawlerClient {
    constructor(apiKey, basePath = BASE_PATH, apiVersion = "v1") {
        this.apiVersion = "v1";
        this.apiKey = apiKey;
        this.basePath = basePath;
        this.apiVersion = apiVersion;
    }
    scrapeAsync(scrapeRequest) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = `${this.basePath}/${this.apiVersion}/scrape`;
            const requestOptions = {
                'method': 'POST',
                'headers': {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                'body': JSON.stringify(scrapeRequest),
            };
            const response = yield fetch(url, requestOptions);
            if (response.ok) {
                return response.json();
            }
            try {
                const data = yield response.json();
                throw new Error(`failed to scrape, response returned ${response.status} ${response.statusText}: ${data === null || data === void 0 ? void 0 : data.error}`);
            }
            catch (e) {
                throw e;
            }
        });
    }
    scrapeWithMeta(scrapeRequest) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = `${this.basePath}/${this.apiVersion}/scrape`;
            const requestOptions = {
                'method': 'POST',
                'headers': {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                'body': JSON.stringify(scrapeRequest),
            };
            const scrapeIDResponse = yield this.sendRequest(url, requestOptions);
            if (scrapeIDResponse.id === '') {
                throw new Error("Failed to fetch job status");
            }
            let delayIntervalMs = initialPullDelayMs;
            for (let i = 0; i < MaxPullRetries; i++) {
                yield new Promise(resolve => setTimeout(resolve, delayIntervalMs));
                const scrapeResult = yield this.getScrapeResult(scrapeIDResponse.id);
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
        });
    }
    scrape(scrapeRequest) {
        return __awaiter(this, void 0, void 0, function* () {
            const scrapeResult = yield this.scrapeWithMeta(scrapeRequest);
            return scrapeResult.structured_data;
        });
    }
    getScrapeResult(scrapeID) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = `${this.basePath}/${this.apiVersion}/scrape/${scrapeID}`;
            const requestOptions = {
                'method': 'GET',
                'headers': {
                    'Authorization': `Bearer ${this.apiKey}`,
                },
            };
            const response = yield fetch(url, requestOptions);
            if (response.ok) {
                return response.json();
            }
            try {
                const data = yield response.json();
                throw new Error(`failed to fetch job status ${response.status} ${response.statusText}: ${JSON.stringify(data)}`);
            }
            catch (e) {
                throw new Error(`failed to fetch job status ${response.status} ${response.statusText}`);
            }
        });
    }
    sendRequest(url, requestOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            let response;
            try {
                response = yield fetch(url, requestOptions);
            }
            catch (e) {
                throw new Error(`Failed to send request: ${e}`);
            }
            if (!response.ok) {
                const errorResponse = yield response.json();
                throw new Error(`${JSON.stringify(errorResponse)}`);
            }
            return response.json();
        });
    }
}
exports.WebcrawlerClient = WebcrawlerClient;
