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

function mapConfig(configObj, env) {
    let configMapper = new ConfigMapper(env);
    return configMapper.mapConfig(configObj);
}

function buildConfig(inputFilename, outputFilename) {
    let inputFilePath = path.join(process.cwd(), inputFilename);
    let outputFilePath = path.join(process.cwd(), outputFilename);

    if (!fs.existsSync(inputFilePath)) {
        utils.logErrorAndThrow(`error building config, ${inputFilePath} not found`);
    }

    let configObj = require(inputFilePath);
    let env = process.env.NODE_ENV || "development";

    console.info(`building configuration, NODE_ENV=${env}, input=${inputFilePath}, output=${outputFilePath}`);

    let mappedConfig = mapConfig(configObj, env);
    let moduleDefinition = `// This file was automatically generated at ${(new Date()).toISOString()}\nmodule.exports = ${JSON.stringify(mappedConfig, null, 4)};\n`;

    utils.ensureDirectoryExistence(outputFilePath);
    fs.writeFileSync(outputFilePath, moduleDefinition);

    module.exports.config = require(outputFilePath);
}
