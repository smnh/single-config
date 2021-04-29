import path from 'path';
import fs from 'fs';
import { logErrorAndThrow, ensureDirectoryExistence } from './utils';
import { ConfigMapper, ConfigMapperOptions } from './config-mapper';

export { ConfigMapper } from './config-mapper';

export let config: Record<string, any> | null = null;

export function mapConfig(
    configObj: Record<string, any>,
    options: ConfigMapperOptions
) {
    const configMapper = new ConfigMapper(options);
    return configMapper.mapConfig(configObj);
}

export interface BuildConfigOptions
    extends Omit<ConfigMapperOptions, 'useSelectors' | 'addSelectors'> {
    useSelectors?: string;
    addSelectors?: string;
    moduleType?: 'globals' | 'node';
    globalModuleName?: string;
}

export function buildConfig(
    inputFilename: string,
    outputFilename: string,
    options: BuildConfigOptions
) {
    const inputFilePath = path.resolve(inputFilename);
    const outputFilePath = path.resolve(outputFilename);
    const configMapperOptions: ConfigMapperOptions = {};

    if (!fs.existsSync(inputFilePath)) {
        logErrorAndThrow(`error building config, ${inputFilePath} not found`);
    }

    options = options || {};

    configMapperOptions.env =
        options.env || process.env.NODE_ENV || 'development';

    if (options.useSelectors) {
        configMapperOptions.useSelectors = options.useSelectors.split(',');
    } else if (options.addSelectors) {
        configMapperOptions.addSelectors = options.addSelectors.split(',');
    }

    const configObj = require(inputFilePath);

    console.info(
        `building configuration, env=${configMapperOptions.env}, input=${inputFilePath}, output=${outputFilePath}`
    );

    const mappedConfig = mapConfig(configObj, configMapperOptions);
    let moduleDefinition = `// This file was automatically generated at ${new Date().toISOString()}\nmodule.exports = ${JSON.stringify(
        mappedConfig,
        null,
        4
    )};\n`;

    let moduleType = 'node';
    if (options.moduleType === 'globals') {
        moduleType = options.moduleType;
    }

    if (moduleType === 'node') {
        moduleDefinition = `// This file was automatically generated at ${new Date().toISOString()}\nmodule.exports = ${JSON.stringify(
            mappedConfig,
            null,
            4
        )};\n`;
    } else if (moduleType === 'globals') {
        const globalVarName = options.globalModuleName || 'config';
        moduleDefinition = `// This file was automatically generated at ${new Date().toISOString()}\n${globalVarName} = ${JSON.stringify(
            mappedConfig,
            null,
            4
        )};\n`;
    }

    ensureDirectoryExistence(outputFilePath);
    fs.writeFileSync(outputFilePath, moduleDefinition);

    if (moduleType === 'node') {
        module.exports.config = require(outputFilePath);
    }
}
