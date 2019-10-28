const path = require('path');
const fs = require('fs');
const utils = require('./utils');
const ConfigMapper = require('./config-mapper');
const renderConfig = require('./config-render');

module.exports = {
    ConfigMapper: ConfigMapper,
    config: null,
    mapConfig,
    renderConfig,
    buildConfig
};

function mapConfig(configObj, options) {
    let configMapper = new ConfigMapper(options);
    return configMapper.mapConfig(configObj);
}

function buildConfig(inputFilename, outputFilename, options) {
    let inputFilePath = path.resolve(inputFilename);
    let outputFilePath = path.resolve(outputFilename);
    let configMapperOptions = {};

    if (!fs.existsSync(inputFilePath)) {
        utils.logErrorAndThrow(`error building config, ${inputFilePath} not found`);
    }

    options = options || {};

    configMapperOptions.env = options.env || process.env.NODE_ENV || "development";

    if (options.useSelectors) {
        configMapperOptions.useSelectors = options.useSelectors.split(',');
    } else if (options.addSelectors) {
        configMapperOptions.addSelectors = options.addSelectors.split(',');
    }

    let configObj = require(inputFilePath);

    console.info(`building configuration, env=${configMapperOptions.env}, input=${inputFilePath}, output=${outputFilePath}`);

    const mappedConfig = mapConfig(configObj, configMapperOptions);
    const moduleDefinition = renderConfig(options, mappedConfig);

    utils.ensureDirectoryExistence(outputFilePath);
    fs.writeFileSync(outputFilePath, moduleDefinition);

    if (options.moduleType === 'node') {
        module.exports.config = require(outputFilePath);
    }
}
