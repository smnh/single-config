#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ArgumentParser = require('argparse').ArgumentParser;
const _ = require('lodash');

const parser = new ArgumentParser({
    version: '1.0.0',
    addHelp: true,
    description: 'Builds a module (default: config.js) from a single json configuration file (default: config.json) ' +
    'by picking leaf nodes matching the current NODE_ENV ("prod" mapped to "production", "dev" mapped to "development"). ' +
    'For more info visit https://github.com/smnh/buildconfig'
});
parser.addArgument(['-i', '--input'], {
    defaultValue: './config.json',
    help: 'The file path of the input json relative to the current working directory, default: ./config.json'
});
parser.addArgument(['-o', '--output'], {
    defaultValue: './config.js',
    help: 'The file path of the output module relative to the current working directory, default: ./config.js'
});

const args = parser.parseArgs();
const inputFilename = args.input;
const outputFilename = args.output;
const envWhiteListSelectors = ['default', 'local', 'dev', 'test', 'prod'];
const envAliases = {"development": "dev", "production": "prod"};
const inputFilePath = path.join(process.cwd(), inputFilename);

if (!fs.existsSync(inputFilePath)) {
    let message = `ERROR: ${inputFilename} can not be found`;
    console.error('\033[31m' + message + '\033[0m');
    throw new Error(message);
}

const configObj = require(inputFilePath);

let env = process.env.NODE_ENV || "development";
let config = {env: env};
let confPath = [];

console.log(`building configuration, NODE_ENV=${env}, input=${inputFilename}, output=${outputFilename}`);

if (env in envAliases) {
    env = envAliases[env];
}

function validateConfigObjectLevel(obj, envSelector) {
    Object.keys(obj).forEach(function(key) {
        // When we check configuration node for environment selector, we don't want fields other than environment
        // selectors to be present on that node. And vice-versa, when we check configuration node for configuration
        // key, we don't want environment selectors to be present on that node.
        if (envSelector ^ envWhiteListSelectors.includes(key)) {
            let message = `ERROR: ${inputFilename} has illegal structure: reached configuration node with environment selector mixed with configuration field [${confPath.join('.')}]`;
            console.error('\033[31m' + message + '\033[0m');
            throw new Error(message);
        }
    });
}

function mapConfigObjectToEnv(obj) {

    if (!_.isPlainObject(obj)) {
        let message = `ERROR: ${inputFilename} has illegal structure: reached leaf configuration node before reaching environment selector [${confPath.join('.')}]`;
        console.error('\033[31m' + message + '\033[0m');
        throw new Error(message);
    }

    let defaultConf;
    if ('default' in obj) {
        validateConfigObjectLevel(obj, true);
        defaultConf = obj['default'];
    }

    if (env in obj) {
        validateConfigObjectLevel(obj, true);
        if (_.isPlainObject(defaultConf) && _.isPlainObject(obj[env])) {
            return Object.assign({}, defaultConf, obj[env]);
        } else {
            return obj[env];
        }
    } else if (typeof defaultConf !== 'undefined') {
        return defaultConf;
    }

    let result = {};
    validateConfigObjectLevel(obj, false);
    Object.keys(obj).forEach(function(key) {
        confPath.push(key);
        result[key] = mapConfigObjectToEnv(obj[key]);
        confPath.pop();
    });
    return result;
}

function ensureDirectoryExistence(filePath) {
    let dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}

Object.assign(config, mapConfigObjectToEnv(configObj));

let modulePath = path.join(process.cwd(), outputFilename);
let moduleDefinition = `// This file was automatically generated at ${(new Date()).toISOString()}
module.exports = ${JSON.stringify(config, null, 4)};\n`;

ensureDirectoryExistence(modulePath);
fs.writeFileSync(modulePath, moduleDefinition);

module.exports = require('./config-demo');
