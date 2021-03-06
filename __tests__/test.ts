import * as fs from 'fs';

describe('Test ConfigMapper', () => {
    beforeAll(() => {
        delete process.env.NODE_ENV;
    });

    afterAll(() => {
        process.env.NODE_ENV = 'test';
    });

    beforeEach(() => {
        jest.resetModules();
    });

    test('use "development" if env was not provided and NODE_ENV was not defined', () => {
        delete process.env.NODE_ENV;
        const configObj = {
            _envs: ['dev', 'prod'],
            prop: {
                default: 'defaultValue',
                dev: 'devValue',
                prod: 'prodValue',
            },
        };
        const expectedMappedConfig = {
            env: 'development',
            prop: 'devValue',
        };

        const configMapper = require('../src/index');
        const mappedConfig = configMapper.mapConfig(configObj);

        expect(mappedConfig).toEqual(expectedMappedConfig);
    });

    test('use the defined NODE_ENV if env was not specified', () => {
        process.env.NODE_ENV = 'production';
        const configObj = {
            _envs: ['dev', 'prod'],
            prop: {
                default: 'defaultValue',
                dev: 'devValue',
                prod: 'prodValue',
            },
        };
        const expectedMappedObj = {
            env: 'production',
            prop: 'prodValue',
        };
        const configMapper = require('../src/index');
        const mappedConfig = configMapper.mapConfig(configObj);

        expect(mappedConfig).toEqual(expectedMappedObj);
    });

    test('use the provided env even if the defined NODE_ENV is different', () => {
        process.env.NODE_ENV = 'production';
        const options = { env: 'development' };
        const configObj = {
            _envs: ['dev', 'prod'],
            prop: {
                default: 'defaultValue',
                dev: 'devValue',
                prod: 'prodValue',
            },
        };
        const expectedMappedObj = {
            env: 'development',
            prop: 'devValue',
        };
        const configMapper = require('../src/index');
        const mappedConfig = configMapper.mapConfig(configObj, options);

        expect(mappedConfig).toEqual(expectedMappedObj);
    });

    test('test build config with CommonJS as default moduleType', async () => {
        const configObj = {
            _envs: ['dev', 'prod'],
            prop: {
                default: 'defaultValue',
                dev: 'devValue',
                prod: 'prodValue',
            },
        };
        const expectedMappedObj = {
            env: 'dev',
            prop: 'devValue',
        };
        const expectedOutputRe = new RegExp(
            `^[^\\n]*\\nmodule\\.exports = ${JSON.stringify(
                expectedMappedObj,
                null,
                4
            ).replace(/\n/g, '\\n')};\\n$`
        );
        const path = require('path');
        const inputFilePath = path.resolve(__dirname, 'test-config.json');
        const outputFilePath = path.resolve(__dirname, 'config.js');
        fs.writeFileSync(inputFilePath, JSON.stringify(configObj));

        const configMapper = require('../src/index');
        await configMapper.buildConfig(inputFilePath, outputFilePath, {
            env: 'dev',
        });

        fs.unlinkSync(inputFilePath);
        const outputFileExists = fs.existsSync(outputFilePath);
        let output: string | undefined;
        if (outputFileExists) {
            output = fs.readFileSync(outputFilePath, 'utf8');
            fs.unlinkSync(outputFilePath);
        }

        expect(outputFileExists).toBeTruthy();
        expect(configMapper.config).toEqual(expectedMappedObj);
        expect(output).toMatch(expectedOutputRe);
    });

    test('test build config with globals as moduleType', async () => {
        const configObj = {
            _envs: ['dev', 'prod'],
            prop: {
                default: 'defaultValue',
                dev: 'devValue',
                prod: 'prodValue',
            },
        };
        const expectedMappedObj = {
            env: 'dev',
            prop: 'devValue',
        };
        const expectedOutputRe = new RegExp(
            `^[^\\n]*\\nconfig = ${JSON.stringify(
                expectedMappedObj,
                null,
                4
            ).replace(/\n/g, '\\n')};\\n$`
        );
        const path = require('path');
        const inputFilePath = path.resolve(__dirname, 'test-config.json');
        const outputFilePath = path.resolve(__dirname, 'config.js');
        fs.writeFileSync(inputFilePath, JSON.stringify(configObj));

        const configMapper = require('../src/index');
        await configMapper.buildConfig(inputFilePath, outputFilePath, {
            env: 'dev',
            moduleType: 'globals',
        });

        fs.unlinkSync(inputFilePath);
        const outputFileExists = fs.existsSync(outputFilePath);
        let output: string | undefined;
        if (outputFileExists) {
            output = fs.readFileSync(outputFilePath, 'utf8');
            fs.unlinkSync(outputFilePath);
        }

        expect(outputFileExists).toBeTruthy();
        expect(output).toMatch(expectedOutputRe);
    });

    test('test build config with TypeScript as moduleType', async () => {
        const configObj = {
            _envs: ['dev', 'prod'],
            prop: {
                default: 'defaultValue',
                dev: 'devValue',
                prod: 'prodValue',
            },
            prodProp: {
                default: null,
                prod: 'prodPropValue',
            },
        };
        const expectedOutput = `
const config = {
    "env": "dev",
    "prop": "devValue",
    "prodProp": null
};

export type BaseConfig = {
    "env": string,
    "prop": string,
    "prodProp": (null | string)
};

export type Config = BaseConfig;

export default (config as Config);
`;
        const path = require('path');
        const inputFilePath = path.resolve(__dirname, 'test-config.json');
        const outputFilePath = path.resolve(__dirname, 'config.ts');
        fs.writeFileSync(inputFilePath, JSON.stringify(configObj));

        const configMapper = require('../src/index');
        await configMapper.buildConfig(inputFilePath, outputFilePath, {
            env: 'dev',
            moduleType: 'typescript',
        });

        fs.unlinkSync(inputFilePath);
        const outputFileExists = fs.existsSync(outputFilePath);
        let output: string | undefined;
        if (outputFileExists) {
            output = fs.readFileSync(outputFilePath, 'utf8');
            fs.unlinkSync(outputFilePath);
        }

        expect(outputFileExists).toBeTruthy();
        expect((output ?? '').split('\n').slice(1).join('\n')).toMatch(
            expectedOutput
        );
    });

    test('build fails if no envs are specified', () => {
        expect(() => {
            const configMapper = require('../src/index');
            const options = { env: 'prod' };
            const configObj = {};
            configMapper.mapConfig(configObj, options);
        }).toThrow();
    });

    test('build fails if provided env is not supported', () => {
        expect(() => {
            const configMapper = require('../src/index');
            const options = { env: 'unsupported' };
            const configObj = { _envs: ['dev', 'prod'] };
            configMapper.mapConfig(configObj, options);
        }).toThrow();
    });

    test('build fails if configuration is empty object', () => {
        expect(() => {
            const configMapper = require('../src/index');
            const options = { env: 'development' };
            const configObj = { _envs: ['dev', 'prod'] };
            configMapper.mapConfig(configObj, options);
        }).toThrow();
    });

    test('build fails if configuration has a branch with scalar leaf node', () => {
        expect(() => {
            const configMapper = require('../src/index');
            const options = { env: 'development' };
            const configObj = {
                _envs: ['dev'],
                normalProp: {
                    dev: 'devValue',
                },
                parentProp: {
                    childProp: 'value',
                },
            };
            configMapper.mapConfig(configObj, options);
        }).toThrow();
    });

    test('build fails if configuration node has provided env selector mixed with non selectors', () => {
        expect(() => {
            const configMapper = require('../src/index');
            const options = { env: 'development' };
            const configObj = {
                _envs: ['dev'],
                prop: {
                    dev: 'devValue',
                    notSelectorProp: 'value',
                },
            };
            configMapper.mapConfig(configObj, options);
        }).toThrow();
    });

    test('build fails if configuration node has only the default selector mixed with non selectors', () => {
        expect(() => {
            const configMapper = require('../src/index');
            const options = { env: 'development' };
            const configObj = {
                _envs: ['dev'],
                prop: {
                    default: 'defaultValue',
                    notSelectorProp: 'value',
                },
            };
            configMapper.mapConfig(configObj, options);
        }).toThrow();
    });

    test('build fails if configuration node properties mixed with selectors other than default and the provided env selector', () => {
        expect(() => {
            const configMapper = require('../src/index');
            const options = { env: 'development' };
            const configObj = {
                _envs: ['dev', 'test'],
                prop: {
                    test: 'testValue',
                    notSelectorProp: 'value',
                },
            };
            configMapper.mapConfig(configObj, options);
        }).toThrow();
    });

    test('default value should be shallowly merged with provided env selector', () => {
        const configMapper = require('../src/index');
        const options = { env: 'development' };
        const configObj = {
            _envs: ['dev'],
            prop: {
                default: {
                    prop1: 'prop1Default',
                    prop2: 'prop2Default',
                },
                dev: {
                    prop2: 'prop2Dev',
                    prop3: 'prop3Dev',
                },
            },
        };
        const expectedMappedObj = {
            env: 'development',
            prop: {
                prop1: 'prop1Default',
                prop2: 'prop2Dev',
                prop3: 'prop3Dev',
            },
        };
        const mappedConfig = configMapper.mapConfig(configObj, options);

        expect(mappedConfig).toEqual(expectedMappedObj);
    });

    test('default value should be used if no provided env selector was specified', () => {
        const configMapper = require('../src/index');
        const options = { env: 'development' };
        const configObj = {
            _envs: ['dev', 'test', 'prod'],
            prop: {
                default: 'defaultValue',
                test: 'testValue',
                prod: 'prodValue',
            },
        };
        const expectedMappedObj = {
            env: 'development',
            prop: 'defaultValue',
        };
        const mappedConfig = configMapper.mapConfig(configObj, options);

        expect(mappedConfig).toEqual(expectedMappedObj);
    });

    test('use new set of selectors when useSelectors was provided', () => {
        const configMapper = require('../src/index');
        const options = {
            env: 'devNew',
        };
        const configObj = {
            _envs: ['devNew', 'prod'],
            prop: {
                default: 'defaultValue',
                devNew: 'devNewValue',
                prod: 'prodValue',
            },
        };
        const expectedMappedObj = {
            env: 'devNew',
            prop: 'devNewValue',
        };
        const mappedConfig = configMapper.mapConfig(configObj, options);

        expect(mappedConfig).toEqual(expectedMappedObj);
    });

    test('append selectors when addSelectors was provided', () => {
        const configMapper = require('../src/index');
        const options = {
            env: 'devNew',
        };
        const configObj = {
            _envs: ['devNew', 'prod'],
            prop: {
                default: 'defaultValue',
                devNew: 'devNewValue',
                prod: 'prodValue',
            },
        };
        const expectedMappedObj = {
            env: 'devNew',
            prop: 'devNewValue',
        };
        const mappedConfig = configMapper.mapConfig(configObj, options);

        expect(mappedConfig).toEqual(expectedMappedObj);
    });
});
