export const JobStatus = {
    IN_PROGRESS: 'in_progress',
    NEW: 'new',
    DONE: 'done'
} as const;

export const ErrorCode = {
    BLOCKED_BY_ROBOTS_TXT: 'blocked_by_robots_txt'
} as const;

export const HttpStatus = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500
} as const; 