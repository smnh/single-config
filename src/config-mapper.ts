import _ from 'lodash';
import { logErrorAndThrow } from './utils';

const DEFAULT_SELECTOR = 'default';
const NODE_ENV_ALIASES: Record<string, string> = {
    development: 'dev',
    production: 'prod',
};

export type ConfigObj = Record<string, any> & { _envs: string[] };

export interface ConfigMapperOptions {
    env?: string;
}

export class ConfigMapper {
    env: string;
    confPath: string[];
    envSelector: string;

    constructor(options: ConfigMapperOptions) {
        options = options || {};
        this.env = options.env || process.env.NODE_ENV || 'development';
        this.confPath = [];
        this.envSelector = NODE_ENV_ALIASES[this.env] ?? this.env;
    }

    validateConfigObjectLevel(
        obj: Record<string, any>,
        envs: string[],
        envSelectorOnly: boolean
    ): void {
        // When we check configuration node for environment selectors, we don't
        // want fields other than environment selectors to be present on that node.
        // And vice-versa, when we check configuration node for configuration
        // properties, we don't want environment selectors to be present on that node.
        Object.keys(obj).forEach((key) => {
            if (envSelectorOnly !== envs.includes(key)) {
                logErrorAndThrow(
                    new Error(
                        `error building config, illegal structure: reached configuration node '${this.confPath.join(
                            '.'
                        )}' having environment selector mixed with configuration field`
                    )
                );
            }
        });
    }

    mapConfig(configObj: ConfigObj) {
        if (
            !Array.isArray(configObj._envs) ||
            typeof configObj._envs[0] !== 'string'
        ) {
            logErrorAndThrow(
                new Error(
                    'error building config, _envs must be specified and must be an array of strings'
                )
            );
        }
        const { _envs: userEnvs, ...obj } = configObj;
        if (!userEnvs.includes(this.envSelector!)) {
            logErrorAndThrow(
                new Error(
                    `error building config, environment selector '${this.envSelector}' is not supported`
                )
            );
        }
        const envs = [DEFAULT_SELECTOR].concat(userEnvs);
        const mappedConfig = this.mapConfigNode(obj, envs);
        return Object.assign({ env: this.env }, mappedConfig);
    }

    mapConfigNode(
        obj: Record<string, any>,
        envs: string[]
    ): Record<string, any> {
        if (!_.isPlainObject(obj) || Object.keys(obj).length === 0) {
            logErrorAndThrow(
                new Error(
                    `error building config, illegal structure: reached leaf configuration node '${this.confPath.join(
                        '.'
                    )}' before reaching environment selector`
                )
            );
        }

        if (this.envSelector in obj) {
            // If current object node has current environment selector, use its value.
            this.validateConfigObjectLevel(obj, envs, true);
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
            this.validateConfigObjectLevel(obj, envs, true);
            return obj[DEFAULT_SELECTOR];
        }

        const result: Record<string, any> = {};
        // We did not find nor the 'default' selector nor current environment selector, make sure no other selectors
        // present in current object node.
        this.validateConfigObjectLevel(obj, envs, false);
        Object.keys(obj).forEach((key) => {
            this.confPath.push(key);
            result[key] = this.mapConfigNode(obj[key], envs);
            this.confPath.pop();
        });
        return result;
    }
}
