
describe('Test ConfigMapper', () => {

    beforeAll(() => {
        delete process.env.NODE_ENV;
    });

    afterAll(() => {
        process.env.NODE_ENV = "test";
    });

    beforeEach(() => {
        jest.resetModules()
    });

    test('use "development" if env was not provided and NODE_ENV was not defined', () => {
        delete process.env.NODE_ENV;
        let configObj = {
            "prop": {
                "default": "defaultValue",
                "dev": "devValue",
                "prod": "prodValue"
            }
        };
        let expectedMappedConfig = {
            "env": "development",
            "prop": "devValue"
        };

        let configMapper = require('../src/index');
        let mappedConfig = configMapper.mapConfig(configObj);

        expect(mappedConfig).toEqual(expectedMappedConfig);
    });

    test('use the defined NODE_ENV if env was not specified', () => {
        process.env.NODE_ENV = "production";
        let configObj = {
            "prop": {
                "default": "defaultValue",
                "dev": "devValue",
                "prod": "prodValue"
            }
        };
        let expectedMappedObj = {
            "env": "production",
            "prop": "prodValue"
        };
        let configMapper = require('../src/index');
        let mappedConfig = configMapper.mapConfig(configObj);

        expect(mappedConfig).toEqual(expectedMappedObj);
    });

    test('use the provided env even if the defined NODE_ENV is different', () => {
        process.env.NODE_ENV = "production";
        let currentEnv = "development";
        let configObj = {
            "prop": {
                "default": "defaultValue",
                "dev": "devValue",
                "prod": "prodValue"
            }
        };
        let expectedMappedObj = {
            "env": "development",
            "prop": "devValue"
        };
        let configMapper = require('../src/index');
        let mappedConfig = configMapper.mapConfig(configObj, currentEnv);

        expect(mappedConfig).toEqual(expectedMappedObj);
    });

    test('build fails if provided env is not supported', () => {
        expect(() => {
            let configMapper = require('../src/index');
            let currentEnv = "unsupported";
            let configObj = {};
            configMapper.mapConfig(configObj, currentEnv);
        }).toThrow();
    });

    test('build fails if configuration is empty object', () => {
        expect(() => {
            let configMapper = require('../src/index');
            let currentEnv = "development";
            let configObj = {};
            configMapper.mapConfig(configObj, currentEnv);
        }).toThrow();
    });

    test('build fails if configuration has a branch with scalar leaf node', () => {
        expect(() => {
            let configMapper = require('../src/index');
            let currentEnv = "development";
            let configObj = {
                "normalProp": {
                    "dev": "devValue"
                },
                "parentProp": {
                    "childProp": "value"
                }
            };
            configMapper.mapConfig(configObj, currentEnv);
        }).toThrow();
    });

    test('build fails if configuration node has provided env selector mixed with non selectors', () => {
        expect(() => {
            let configMapper = require('../src/index');
            let currentEnv = "development";
            let configObj = {
                "prop": {
                    "dev": "devValue",
                    "notSelectorProp": "value"
                }
            };
            configMapper.mapConfig(configObj, currentEnv);
        }).toThrow();
    });

    test('build fails if configuration node has only the default selector mixed with non selectors', () => {
        expect(() => {
            let configMapper = require('../src/index');
            let currentEnv = "development";
            let configObj = {
                "prop": {
                    "default": "defaultValue",
                    "notSelectorProp": "value"
                }
            };
            configMapper.mapConfig(configObj, currentEnv);
        }).toThrow();
    });

    test('build fails if configuration node properties mixed with selectors other than default and the provided env selector', () => {
        expect(() => {
            let configMapper = require('../src/index');
            let currentEnv = "development";
            let configObj = {
                "prop": {
                    "test": "testValue",
                    "notSelectorProp": "value"
                }
            };
            configMapper.mapConfig(configObj, currentEnv);
        }).toThrow();
    });

    test('default value should be shallowly merged with provided env selector', () => {
        let configMapper = require('../src/index');
        let currentEnv = "development";
        let configObj = {
            "prop": {
                "default": {
                    "prop1": "prop1Default",
                    "prop2": "prop2Default"
                },
                "dev": {
                    "prop2": "prop2Dev",
                    "prop3": "prop3Dev"
                }
            }
        };
        let expectedMappedObj = {
            "env": "development",
            "prop": {
                "prop1": "prop1Default",
                "prop2": "prop2Dev",
                "prop3": "prop3Dev"
            }
        };
        let mappedConfig = configMapper.mapConfig(configObj, currentEnv);

        expect(mappedConfig).toEqual(expectedMappedObj);
    });

    test('default value should be used if no provided env selector was specified', () => {
        let configMapper = require('../src/index');
        let currentEnv = "development";
        let configObj = {
            "prop": {
                "default": "defaultValue",
                "test": "testValue",
                "prod": "prodValue"
            }
        };
        let expectedMappedObj = {
            "env": "development",
            "prop": "defaultValue"
        };
        let mappedConfig = configMapper.mapConfig(configObj, currentEnv);

        expect(mappedConfig).toEqual(expectedMappedObj);
    });

});
