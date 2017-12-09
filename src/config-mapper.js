const _ = require('lodash');
const utils = require('./utils');

const DEFAULT_SELECTOR = 'default';
const WHITELIST_SELECTORS = [DEFAULT_SELECTOR, 'local', 'dev', 'test', 'prod'];
const NOD_ENV_ALIASES = {
    "development": "dev",
    "production": "prod"
};

module.exports = ConfigMapper;

function ConfigMapper(env) {
    if (!env) {
        env = process.env.NODE_ENV || "development";
    }
    this.env = env;
    this.confPath = [];
    let envSelector = (env in NOD_ENV_ALIASES) ? NOD_ENV_ALIASES[env] : env;
    if (!WHITELIST_SELECTORS.includes(envSelector)) {
        utils.logErrorAndThrow(`error building config, environment selector '${envSelector}' is not supported`);
    }
    this.envSelector = envSelector;
}

ConfigMapper.prototype.validateConfigObjectLevel = function(obj, envSelectorOnly) {
    // When we check configuration node for environment selectors, we don't
    // want fields other than environment selectors to be present on that node.
    // And vice-versa, when we check configuration node for configuration
    // properties, we don't want environment selectors to be present on that node.
    Object.keys(obj).forEach(function(key) {
        if (envSelectorOnly ^ WHITELIST_SELECTORS.includes(key)) {
            utils.logErrorAndThrow(`error building config, illegal structure: reached configuration node '${this.confPath.join('.')}' having environment selector mixed with configuration field`);
        }
    });
};

ConfigMapper.prototype.mapConfig = function(obj) {
    let mappedConfig = this.mapConfigNode(obj);
    return Object.assign({env: this.env}, mappedConfig);
};

ConfigMapper.prototype.mapConfigNode = function(obj) {

    if (!_.isPlainObject(obj) || Object.keys(obj).length === 0) {
        utils.logErrorAndThrow(`error building config, illegal structure: reached leaf configuration node '${this.confPath.join('.')}' before reaching environment selector`);
    }

    if (this.envSelector in obj) {
        // If current object node has current environment selector, use its value.
        this.validateConfigObjectLevel(obj, true);
        let confValue = obj[this.envSelector];
        if (DEFAULT_SELECTOR in obj && _.isPlainObject(obj[DEFAULT_SELECTOR]) && _.isPlainObject(confValue)) {
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

    let result = {};
    // We did not find nor the 'default' selector nor current environment selector, make sure no other selectors
    // present in current object node.
    this.validateConfigObjectLevel(obj, false);
    Object.keys(obj).forEach(key => {
        this.confPath.push(key);
        result[key] = this.mapConfigNode(obj[key]);
        this.confPath.pop();
    });
    return result;
};
