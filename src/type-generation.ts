type Type =
    | { type: 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'never' }
    | { type: 'array'; items: Type }
    | {
          type: 'object';
          fields: {
              key: string;
              value: Type;
          }[];
      }
    | { type: 'alternatives'; options: Type[] };

type Alternatives = Type & { type: 'alternatives' };

// This function assumes both types are flattened.
function equals(left: Type, right: Type): boolean {
    if (left.type !== right.type) {
        return false;
    }
    if (left.type === 'array' && right.type === 'array') {
        return equals(left.items, right.items);
    }

    // Objects and alternatives of course might be equal, but for our use in the
    // flattenAlternatives function, it doesn't matter. We will unify them, and if
    // they're equal then no harm done.
    if (left.type === 'object' && right.type === 'object') {
        return false;
    }
    if (left.type === 'alternatives' && right.type === 'alternatives') {
        return false;
    }

    return true;
}

function deepFlatten(type: Type): Type {
    switch (type.type) {
        case 'alternatives':
            return flattenAlternatives(type);
        case 'array':
            return {
                type: 'array',
                items: deepFlatten(type.items),
            };
        case 'object':
            return {
                type: 'object',
                fields: type.fields.map(({ key, value }) => ({
                    key,
                    value: deepFlatten(value),
                })),
            };
        default:
            return type;
    }
}

function flattenAlternatives(group: Alternatives): Type {
    const flattenedOptions = group.options
        .reduce((acc: Type[], option) => {
            if (option.type === 'alternatives') {
                const flattenedOption = flattenAlternatives(option);
                if (flattenedOption.type === 'alternatives') {
                    return acc.concat(flattenedOption.options);
                }
                return acc.concat([flattenedOption]);
            }
            return acc.concat([option]);
        }, [])
        .map((option) => deepFlatten(option));
    const uniqueOptions = flattenedOptions
        .reduce((acc: Type[], option) => {
            const existingObject = acc.find((opt) => opt.type === 'object');
            if (existingObject && option.type === 'object') {
                return acc
                    .filter((opt) => opt.type !== 'object')
                    .concat([unify(existingObject, option)]);
            }
            const existingArray = acc.find((opt) => opt.type === 'array');
            if (existingArray && option.type === 'array') {
                return acc
                    .filter((opt) => opt.type !== 'array')
                    .concat([unify(existingArray, option)]);
            }
            if (acc.some((opt) => equals(opt, option))) {
                return acc;
            }
            return acc.concat([option]);
        }, [])
        .map((option) => deepFlatten(option));
    if (uniqueOptions.length === 1) {
        return uniqueOptions[0]!;
    }
    return {
        type: 'alternatives',
        options: uniqueOptions,
    };
}

// Fairly loose unifier, will prefer producing wider types.
function unify(rawLeft: Type, rawRight: Type): Type {
    const left = deepFlatten(rawLeft);
    const right = deepFlatten(rawRight);
    if (left.type === 'never') {
        return right;
    }
    if (right.type === 'never') {
        return left;
    }
    if (left.type === right.type && left.type !== 'alternatives') {
        if (left.type === 'array' && right.type === 'array') {
            return {
                type: 'array',
                items: unify(left.items, right.items),
            };
        }
        if (left.type === 'object' && right.type === 'object') {
            const allKeys = left.fields
                .map(({ key }) => key)
                .concat(right.fields.map(({ key }) => key))
                .reduce(
                    (acc: string[], v) =>
                        acc.includes(v) ? acc : acc.concat([v]),
                    []
                );
            return {
                type: 'object',
                fields: allKeys.map((key) => ({
                    key,
                    value: unify(
                        left.fields.find(({ key: k }) => k === key)?.value ?? {
                            type: 'undefined',
                        },
                        right.fields.find(({ key: k }) => k === key)?.value ?? {
                            type: 'undefined',
                        }
                    ),
                })),
            };
        }
        return left;
    }
    return {
        type: 'alternatives',
        options: [left, right],
    };
}

function infer(obj: any): Type {
    switch (typeof obj) {
        case 'string':
            return { type: 'string' };
        case 'number':
            return { type: 'number' };
        case 'boolean':
            return { type: 'boolean' };
        case 'undefined':
            return { type: 'undefined' };
        case 'object':
            if (obj) {
                if (Array.isArray(obj)) {
                    return {
                        type: 'array',
                        items: obj.reduce((acc, v) => unify(acc, infer(v)), {
                            type: 'never',
                        }),
                    };
                } else {
                    return {
                        type: 'object',
                        fields: Object.entries(obj).map(([k, v]) => ({
                            key: k,
                            value: infer(v),
                        })),
                    };
                }
            } else {
                return { type: 'null' };
            }
        default:
            throw new Error(`unknown value in infer: ${obj}`);
    }
}

function indent(block: string, offset: string): string {
    return block
        .split('\n')
        .map((line) => offset + line)
        .join('\n');
}

function stringify(type: Type): string {
    if (type.type === 'array') {
        const items = stringify(type.items);
        return `${items}[]`;
    }
    if (type.type === 'alternatives') {
        const options = type.options
            .map((option) => stringify(option))
            .join(' | ');
        return `(${options})`;
    }
    if (type.type === 'object') {
        const fields = type.fields
            .map(({ key, value }) => `"${key}": ${stringify(value)}`)
            .join(',\n');
        return `{\n${indent(fields, '  ')}\n}`;
    }
    return type.type;
}

export function generateTypeScriptModule(
    baseConfig: unknown,
    extendedConfig: unknown,
    exportBaseConfig: boolean,
    typesOnly: boolean
): string {
    const config = typesOnly
        ? {}
        : exportBaseConfig
        ? baseConfig
        : extendedConfig;
    return `
const config = ${JSON.stringify(config, null, 4)};

export type BaseConfig = ${stringify(deepFlatten(infer(baseConfig)))};

export type Config = ${stringify(deepFlatten(infer(extendedConfig)))};

export default (config as ${exportBaseConfig ? 'BaseConfig' : 'Config'});
`;
}
