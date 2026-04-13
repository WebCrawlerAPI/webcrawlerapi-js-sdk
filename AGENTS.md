# AGENTS.md

This file provides guidance to Codex when working with code in this repository.

## Build and Development Commands

- **Build**: `npm run build` - Compiles TypeScript to JavaScript in `dist/` directory
- **Package manager**: Uses `pnpm` (pnpm-lock.yaml present)

## High-Level Architecture

This is a TypeScript SDK for the WebcrawlerAPI service that provides web scraping capabilities. The SDK is designed to compile to CommonJS for broader compatibility.

### Core Components

- **WebcrawlerClient** (`src/api.ts`): Main client class that handles all API interactions
  - Supports both synchronous and asynchronous crawling operations
  - Implements automatic polling for job completion
  - Handles authentication via Bearer token
- **Models** (`src/model.ts`): TypeScript interfaces for API requests and responses
  - `CrawlRequest`/`ScrapeRequest`: Input parameters
  - `Job`/`JobItem`: Response structures with job status and items
  - `Action` interfaces: For additional processing like S3 uploads
- **Error Handling** (`src/errors.ts`): Custom `WebcrawlerApiError` class with error codes and HTTP status mapping
- **Constants** (`src/constants.ts`): Job statuses and HTTP status codes

### API Architecture

The SDK supports two main operation modes:

1. **Scraping API (v2)**: Single page scraping with immediate or async polling
2. **Crawling API (v1)**: Multi-page crawling with automatic discovery and filtering

Key features:
- **Content retrieval**: Job items include `getContent()` method that dynamically fetches content based on scrape type (html, cleaned, markdown)
- **Polling mechanism**: Built-in polling with configurable delays and retry limits
- **Type safety**: Full TypeScript support with proper interface definitions

### Configuration

- **TypeScript**: ES2021 target, CommonJS modules, strict mode enabled
- **Output**: Compiles to `dist/` with type declarations in `dist/@types/`
- **Dependencies**: Zero runtime dependencies, uses native `fetch` API

## Development Notes

- Follow SDK best practices as specified in `.cursorrules`
- The project uses TypeScript but compiles to JavaScript for distribution
- Uses modern JavaScript features (ES2021) but maintains CommonJS compatibility