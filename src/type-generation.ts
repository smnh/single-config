import fromEntries from 'object.fromentries';

function sanitizeRecursively(obj: any): any {
    switch (typeof obj) {
        case 'string':
            return '';
        case 'number':
            return 0;
        case 'object':
            if (obj) {
                if (Array.isArray(obj)) {
                    return obj.map((v) => sanitizeRecursively(v));
                } else {
                    return fromEntries(
                        Object.entries(obj).map(([k, v]) => [
                            k,
                            sanitizeRecursively(v),
                        ])
                    );
                }
            } else {
                return obj;
            }
        default:
            return obj;
    }
}

export function stringifyTypedConfig(config: unknown, extendedConfig: unknown) {
    return `((() => {
  const config = ${JSON.stringify(config, null, 4)};
  const configType = ${JSON.stringify(sanitizeRecursively(extendedConfig))};
  return (config as any) as typeof configType;
})())`;
}

export function generateTypeScriptModule(baseConfig: unknown, extendedConfig: unknown, exportBaseConfig: boolean, typesOnly: boolean) {
    const config = typesOnly ? {} : exportBaseConfig ? baseConfig: extendedConfig;
    return `
const config = ${JSON.stringify(config, null, 4)};

const baseConfigType = ${JSON.stringify(sanitizeRecursively(baseConfig), null, 4)};
export type BaseConfig = typeof baseConfigType;

const configType = ${JSON.stringify(sanitizeRecursively(extendedConfig), null, 4)};
export type Config = typeof configType;

export default (config as ${exportBaseConfig ? 'BaseConfig' : 'Config'});
`;
}
