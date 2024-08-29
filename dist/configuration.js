"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Configuration = void 0;
const packageJson = require("../package.json");
class Configuration {
    constructor(param = {}) {
        /**
         * API version, for example: "v1"
         */
        this.apiVersion = "v1";
        this.apiVersion = param.apiVersion;
        if (!this.baseOptions) {
            this.baseOptions = {};
        }
        this.baseOptions = {
            headers: Object.assign({ 'User-Agent': `webcrawlerapi-js/${packageJson.version}`, 'Content-Type': 'application/json' }, this.baseOptions.headers)
        };
    }
}
exports.Configuration = Configuration;
