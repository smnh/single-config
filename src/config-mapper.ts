import _ from 'lodash';
import { logErrorAndThrow } from './utils';

const DEFAULT_SELECTOR = 'default';
const WHITELIST_SELECTORS = [DEFAULT_SELECTOR, 'local', 'dev', 'test', 'prod'];
const NODE_ENV_ALIASES: Record<string, string> = {
    development: 'dev',
    production: 'prod',
};

export function computeAllowedSelectors(useSelectors?: string[], addSelectors?: string[]): string[] {
    if (useSelectors) {
        return _.uniq(
            [DEFAULT_SELECTOR].concat(useSelectors)
        );
    }
    if (addSelectors) {
        return _.uniq(
            WHITELIST_SELECTORS.concat(addSelectors)
        );
    }
    return WHITELIST_SELECTORS;
}

export interface ConfigMapperOptions {
    env?: string;
    useSelectors?: string[];
    addSelectors?: string[];
}

export class ConfigMapper {
    env: string;
    confPath: string[];
    allowedSelectors: string[];
    envSelector: string;

    constructor(options: ConfigMapperOptions) {
        options = options || {};
        this.env = options.env || process.env.NODE_ENV || 'development';
        this.confPath = [];
        this.allowedSelectors = computeAllowedSelectors(options.useSelectors, options.addSelectors);
        const envSelector = NODE_ENV_ALIASES[this.env] ?? this.env;
        if (!this.allowedSelectors.includes(envSelector!)) {
            logErrorAndThrow(
                `error building config, environment selector '${envSelector}' is not supported`
            );
        }
        this.envSelector = envSelector;
    }

    validateConfigObjectLevel(
        obj: Record<string, any>,
        envSelectorOnly: boolean
    ): void {
        // When we check configuration node for environment selectors, we don't
        // want fields other than environment selectors to be present on that node.
        // And vice-versa, when we check configuration node for configuration
        // properties, we don't want environment selectors to be present on that node.
        Object.keys(obj).forEach((key) => {
            if (envSelectorOnly !== this.allowedSelectors.includes(key)) {
                logErrorAndThrow(
                    `error building config, illegal structure: reached configuration node '${this.confPath.join(
                        '.'
                    )}' having environment selector mixed with configuration field`
                );
            }
        });
    }

    mapConfig(obj: Record<string, any>) {
        const mappedConfig = this.mapConfigNode(obj);
        return Object.assign({ env: this.env }, mappedConfig);
    }

    mapConfigNode(obj: Record<string, any>): Record<string, any> {
        if (!_.isPlainObject(obj) || Object.keys(obj).length === 0) {
            logErrorAndThrow(
                `error building config, illegal structure: reached leaf configuration node '${this.confPath.join(
                    '.'
                )}' before reaching environment selector`
            );
        }

        if (this.envSelector in obj) {
            // If current object node has current environment selector, use its value.
            this.validateConfigObjectLevel(obj, true);
            const confValue = obj[this.envSelector];
            if (
                DEFAULT_SELECTOR in obj &&
                _.isPlainObject(obj[DEFAULT_SELECTOR]) &&
                _.isPlainObject(confValue)
            ) {
                // If 'default' selector is also in current object node, and both the 'default' and the 'envSelectors'
                // values are objects, then merge them shallowly overriding default values with envSelector values.
                return Object.assign({}, obj[DEFAULT_SELECTOR], confValue);
            } else {
                return confValue;
            }
        } else if (DEFAULT_SELECTOR in obj) {
            // If current object node has no current environment selector but has the 'default' selector, use its value.
            this.validateConfigObjectLevel(obj, true);
            return obj[DEFAULT_SELECTOR];
        }

        const result: Record<string, any> = {};
        // We did not find nor the 'default' selector nor current environment selector, make sure no other selectors
        // present in current object node.
        this.validateConfigObjectLevel(obj, false);
        Object.keys(obj).forEach((key) => {
            this.confPath.push(key);
            result[key] = this.mapConfigNode(obj[key]);
            this.confPath.pop();
        });
        return result;
    }
}
