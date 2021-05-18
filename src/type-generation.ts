type Type =
    | {
          type:
              | 'string'
              | 'number'
              | 'boolean'
              | 'null'
              | 'undefined'
              | 'unknown';
      }
    | { type: 'array'; items: Type }
    | {
          type: 'object';
          fields: {
              key: string;
              value: Type;
          }[];
      }
    | { type: 'union'; options: Type[] };

type Union = Type & { type: 'union' };

// This function assumes both types are flattened.
// It returns true if the two types are identical, except for object and union
//   types, which always return false. This makes this utility function only useful
//   for use in the flattenUnion function.
function equals(left: Type, right: Type): boolean {
    if (left.type !== right.type) {
        return false;
    }
    if (left.type === 'array' && right.type === 'array') {
        return equals(left.items, right.items);
    }

    // Objects and union of course might be equal, but for our use in the
    // flattenUnion function, it doesn't matter. We will unify them, and if
    // they're equal then no harm done.
    if (left.type === 'object' && right.type === 'object') {
        return false;
    }
    if (left.type === 'union' && right.type === 'union') {
        return false;
    }

    return true;
}

// This function co-recursively flattens (combines union-of-union type into a
//   single union type) of a given type, checking all of its nested types. It's
//   co-recursive counterpart is flattenUnion.
function deepFlatten(type: Type): Type {
    switch (type.type) {
        case 'union':
            return flattenUnion(type);
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

// This function flattens a union type (if any of its options are unions
//   themselves, they are expanded). It is co-recursive with deepFlatten.
function flattenUnion(group: Union): Type {
    const flattenedOptions = group.options
        .reduce((acc: Type[], option) => {
            if (option.type === 'union') {
                const flattenedOption = flattenUnion(option);
                if (flattenedOption.type === 'union') {
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
        type: 'union',
        options: uniqueOptions,
    };
}

// Fairly loose unifier, optimizes for simplicity over correctness.
function unify(rawLeft: Type, rawRight: Type): Type {
    const left = deepFlatten(rawLeft);
    const right = deepFlatten(rawRight);

    // This unification rule simplifies the usage of the resulting type,
    //   although technically this might misleading a user into thinking
    //   unknown isn't an option.
    if (left.type === 'unknown') {
        return right;
    }
    if (right.type === 'unknown') {
        return left;
    }

    if (left.type === right.type && left.type !== 'union') {
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
        type: 'union',
        options: [left, right],
    };
}

// Infers the non-flattened type of a value.
function infer(obj: unknown): Type {
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
                        items: (obj as unknown[]).reduce<Type>(
                            (acc, v) => unify(acc, infer(v)),
                            {
                                type: 'unknown',
                            } as Type
                        ),
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
    if (type.type === 'union') {
        const options = type.options
            .map((option) => stringify(option))
            .join(' | ');
        return `(${options})`;
    }
    if (type.type === 'object') {
        if (type.fields.length === 0) {
            return '{}';
        }
        const fields = type.fields
            .map(({ key, value }) => `"${key}": ${stringify(value)}`)
            .join(',\n');
        return `{\n${indent(fields, '    ')}\n}`;
    }
    return type.type;
}

export function inferStringTypeOfValue(obj: unknown) {
    return stringify(deepFlatten(infer(obj)));
}

export function inferStringTypeOfMultipleValues(obj: unknown[]) {
    const arrayType = deepFlatten(infer(obj));
    if (arrayType.type !== 'array') {
        throw new Error('non-array type inferred from array value');
    }
    return stringify(arrayType.items);
}

export function generateTypeScriptModule(
    config: unknown,
    extendedConfig: unknown,
    allEnvsBaseConfig: unknown[],
    exportBaseConfig: boolean,
    typesOnly: boolean
): string {
    const baseConfigType = inferStringTypeOfMultipleValues(allEnvsBaseConfig);
    const configType = inferStringTypeOfMultipleValues(
        [extendedConfig].concat(allEnvsBaseConfig)
    );

    return `
const config = ${typesOnly ? '{} as any' : JSON.stringify(config, null, 4)};

export type BaseConfig = ${baseConfigType};

export type Config = ${
        baseConfigType === configType ? 'BaseConfig' : configType
    };

export default (config as ${exportBaseConfig ? 'BaseConfig' : 'Config'});
`;
}
