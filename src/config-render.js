function renderConfig(options, mappedConfig) {
    const { moduleType } = options;
    let moduleDefinition = `// This file was automatically generated at ${(new Date()).toISOString()}\n`;

    if (moduleType === 'node') {
        moduleDefinition += `module.exports = ${JSON.stringify(mappedConfig, null, 4)};\n`;
    } else if (moduleType === 'globals') {
        let globalVarName = options.globalModuleName || 'config';
        moduleDefinition += `${globalVarName} = ${JSON.stringify(mappedConfig, null, 4)};\n`;
    } else if (moduleType === 'esm') {
        for (let [key, field] of Object.entries(mappedConfig)) {
            moduleDefinition += `export const ${key} = ${JSON.stringify(field, null, 4)};\n`;
        }
    }

    return moduleDefinition;
}

module.exports = renderConfig;