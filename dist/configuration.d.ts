export interface ConfigurationParameters {
    apiKey?: string;
    basePath?: string;
    apiVersion?: string;
}
export declare class Configuration {
    /**
     * Base options for http call
     */
    baseOptions?: any;
    /**
     * API version, for example: "v1"
     */
    apiVersion: string;
    constructor(param?: ConfigurationParameters);
}
