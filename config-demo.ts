// This file was automatically generated at 2021-05-26T05:43:50.093Z

const config = {
    "env": "dev",
    "prop": "devValue",
    "parentProp": {
        "childProp": true,
        "otherChildProp": [
            "item",
            1,
            true
        ]
    },
    "objectProp": {
        "foo": 1,
        "bar": 3,
        "baz": 4
    }
};

export type BaseConfig = {
    "env": string,
    "prop": string,
    "parentProp": {
        "childProp": boolean,
        "otherChildProp": (string | number | boolean)[]
    },
    "objectProp": {
        "foo": number,
        "bar": number,
        "baz"?: number
    }
};

export type Config = BaseConfig;

export default (config as Config);
