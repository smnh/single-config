const path = require('path');
const fs = require('fs');
const utils = require('./utils');
const ConfigMapper = require('./config-mapper');

module.exports = {
    ConfigMapper: ConfigMapper,
    mapConfig: mapConfig,
    buildConfig: buildConfig,
    config: null
};

function mapConfig(configObj, options) {
    let configMapper = new ConfigMapper(options);
    return configMapper.mapConfig(configObj);
}

function buildConfig(inputFilename, outputFilename, options) {
    let inputFilePath = path.join(process.cwd(), inputFilename);
    let outputFilePath = path.join(process.cwd(), outputFilename);
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

    let mappedConfig = mapConfig(configObj, configMapperOptions);
    let moduleDefinition = `// This file was automatically generated at ${(new Date()).toISOString()}\nmodule.exports = ${JSON.stringify(mappedConfig, null, 4)};\n`;

    utils.ensureDirectoryExistence(outputFilePath);
    fs.writeFileSync(outputFilePath, moduleDefinition);

    module.exports.config = require(outputFilePath);
}
