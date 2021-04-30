# Single Config

[![Build Status](https://travis-ci.org/smnh/single-config.svg?branch=master)](https://travis-ci.org/smnh/single-config)
[![Coverage Status](https://coveralls.io/repos/github/smnh/single-config/badge.svg)](https://coveralls.io/github/smnh/single-config)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg)]()

Small Node.js script that generates configuration model, based on the
value of NODE_ENV, from a single JSON configuration file which specifies
configuration values for all possible environments.

![config-demo](./etc/config-demo.png)


## Why

1. To easily maintain and quickly identify all possible configuration
   values among different environments. I find it less convenient to
   have configuration scattered between different configuration files
   (e.g.: `config.js`, `config.local.js`, `config.dev.js`, etc.).
   Instead, having all configuration in one place make it less likely to
   miss some configuration property.
2. Built configuration is a module exporting object with own enumerated
   properties. Therefore, auto-complete in advanced IDEs such as
   WebStorm work out-of-the-box. No need to write
   `config.get('parent.child')`, just `config.parent.child`.


## Usage

`config.json`

```json
{
    "myProp": {
        "default": "myDefaultValue",
        "local": "myLocalValue",
        "dev": "myDevValue",
        "prod": "myProdValue"
    },
    "parentProp": {
        "childProp": {
            "local": false,
            "dev": true,
            "prod": false
        },
        "otherChildProp": {
            "default": ["item", 1, true]
        }
    },
    "myObject": {
        "default": {
            "foo": 1,
            "bar": 2
        },
        "dev": {
            "bar": 3,
            "foobar": 4
        }
    }
}
```

`$ buildconfig --input=./config.json --output=./config.js --env=development`

> In the above example the `--input` and the `--output` arguments are
  redundant as they have been set to their default values.

`config.js`

```javascript
// This file was automatically generated at <ISO_DATE>
module.exports = {
    "env": "development",
    "myProp": "myDevValue",
    "parentProp": {
        "childProp": true,
        "otherChildProp": ["item", 1, true]
    },
    "myObject": {
        "foo": 1,
        "bar": 3,
        "foobar": 4
    }
};
```

Using the configuration in application modules:

```javascript
const config = require('./config');
console.assert(config.parentProp.childProp);
```


## buildconfig Arguments

- `--input`: The file path of the input json relative to the current working directory, default: ./config.json
- `--output`: The file path of the output module relative to the current working directory, default: ./config.js
- `--env`: Environment value (for dev or prod specify "development" or "production"), if specified overrides NODE_ENV
- `--add-selectors`: Comma-separated selectors that will be added to the default set of selectors, ignored if --use-selectors is specified
- `--use-selectors`: Comma-separated selectors that will be used instead the default set of selectors, the `default` selector will not be overridden


## Environment selectors

- `default`: used if no other sibling selectors match `NODE_ENV`
- `local`: used if `NODE_ENV` is `local`
- `dev`: used if `NODE_ENV` is `development`
- `prod`: used if `NODE_ENV` is `production`
- `test`: used if `NODE_ENV` is `test`

> Matching selectors for `development` and `production` are `dev` and
  `prod` respectively. This is to allow using the shorter versions
  inside configuration json.

> Omitting `default` will throw an error if the build script will not
  find selector matching the current `NODE_ENV`. Therefore, not using
  `default` is a good way to enforce writing selectors for every
  environment.


## Environment selectors level

The environment selectors can appear at any level of the configuration
json. The only restriction is that once the environment selector is used
all other sibling nodes at this level must also be environment selectors.

`config.json`

```json
{
    "simpleValue": {
        "default": "hello",
        "prod": "world"
    },
    "object": {
        "nestedValue": {
            "default": "foo",
            "dev": "bar",
            "prod": "foobar"
        }
    }
}
```

`$ buildconfig --env=development`

```javascript
const config = require('./config');
console.assert(config.simpleValue === "hello");
console.assert(config.object.nestedValue === "bar");
```


## Selected values can be any JSON supported types

```json
{
    "simpleValue": {
        "local": {
            "property": true,
            "foo": "bar"
        },
        "dev": {
            "property": false,
            "arr": ["item", 2]
        },
        "prod": "does not have to be same type as local or dev"
    }
}
```

It is generally suggested to use environment selectors as the last nesting
level that references scalar values instead of nested objects. This allows
better visual comparison between environment values. After all, this was
the main idea behind this kind of configuration management - "To easily
maintain and quickly identify all possible configuration values among
different environments".

Another advantage of doing this is making sure that all properties where
defined for the current environment (if `default` was not defined).

Therefore, instead of doing this:

```json
{
    "parentProp": {
        "dev": {
            "childProp1": true,
            "childProp2": "foo"
        },
        "dev": {
            "childProp1": false,
            "childProp2": "bar"
        }
    }
}
```

do this:

```json
{
    "parentProp": {
        "childProp1": {
            "dev": true,
            "prod": false
        },
        "childProp2": {
            "dev": "foo",
            "prod": "bar"
        }
    }
}
```

If object is used for both `default` and current `NODE_ENV` selectors,
its properties will be shallowly merged:
`Object.assign({}, obj['default'], obj[NODE_ENV])`.


## Example package.json scripts

Following example demonstrates how to add a script to package.json file for
running the buildconfig. This allows chaining the buildconfig task as part of a
build script.

```
{
  "name": "example",
  "version": "1.0.0",
  "scripts": {
    "build-config-local": "buildconfig --env local",
    "build-config-dev": "buildconfig --env development",
    "build": "npm run build-config-local && webpack"
  },
  "dependencies": {
    "single-config": "^1.0.0",
    ...
  }
}
```

## Configuration JSON Restriction

The build script checks for the following restrictions and will throw an
error if one of them is not fulfilled.

- Configuration property names can not use environment selectors:
  `default`, `local`, `dev`, `test`, `prod`. Although objects referenced
  by environment selectors can have such properties.
- Environment selector level must have the current `NODE_ENV` or
  the `default` selector. For this reason, it is suggested not to use
  `default` selector to ensure that every environment has its own
  configuration value.
- Environment selector level must include only environment selectors. If
  environment selector is used, then all its sibling nodes must be
  environment selectors as well.
- Environment selectors must appear at some level of any branch of the
  configuration json.

## Generating Typed Configuration

To be more usable in TypeScript projects, `single-config` is able to generate
simple type definitions for the config file. If building the configuration with
the CLI (i.e. with `buildconfig`), an extra option `--module-type typescript`
will generate a TypeScript file instead of a JavaScript file.

Note that the types generated are a best-effort guess. It is possible to
override types manually if needed.

```typescript
import generatedConfig from './generated-config'; // generated-config.ts
type ConfigUsers = Record<string, number>;
type Config = Omit<typeof config, 'users'> & { users: ConfigUsers };

// You may or may not need to cast "generatedConfig" to "any".
const config: Config = generatedConfig;
```

If your project mixes static configuration with dynamic configuration (e.g. from
service discovery or a parameter store), you can generate the configuration by
writing your own build config script that calls the exported buildConfig
function with the `loadDynamicConfig` option. If present, `loadDynamicConfig` is
expected to be a function that receives the base configuration generated by
`simple-config` and returns an enhanced configuration object that includes both
the base configuration and additional values. `simple-config` will generate type
definitions that include the dynamic configuration.

An additional option to `loadDynamicConfig` is `excludeDynamicConfigFromFile`
which will tell `simple-config` to output a file with only the base
configuration, but with the full configuration (static and dynamic) types. This
may be desirable for security purposes. Your application can reuse the same
dynamic configuration logic that was provided in `loadDynamicConfig` in runtime
to include the dynamic configuration values.

When building the project in a build/CI server, dynamic configuration will
likely not be available for the code generation. `single-config` is able to
generate an empty configuration file with proper typing, which you can check
into your source control repository to be available for type-checking at
build-time.

```typescript
// Configuration build script
import { buildConfig } from 'single-config';
import { enhanceWithParameterStore } from './services/parameter-store';

(async () => {
    await buildConfig(
        '../config.json',
        './base-config.ts',
        {
            moduleType: 'typescript',
            loadDynamicConfig: enhanceWithParameterStore,
            excludeDynamicConfigFromFile: true,
            typeOnlyOutput: './base-config-types.ts'
        }
    );
})()

// Usage
import generatedConfig, { BaseConfig, Config } from './base-config';

async function getConfig(): Config {
    // This reassignment is only included to demonstrate the type of baseConfig.
    const baseConfig: BaseConfig = generatedConfig;
    return enhanceWithParameterStore(baseConfig);
}
```

Add `base-config.ts` to the `.gitignore` file, but allow base-config-types.ts to
be checked into Git. In the build/CI server, instead of running the
configuration build script, run
`cp src/base-config-types.ts src/base-config.ts`. This will allow TypeScript to
check and compile the project without having any environment-specific secrets in
the CI server. If your dynamic configuration logic depends on types exported by
the process, you should also configure your `npm` script that build the
configuration file to do this copy before calling `single-config`.

`typeOnlyOutput` can be used whenever the `moduleType` is set to `typescript`
and does not depend on the dynamic configuration functionality in any way. Of
course, without dynamic configuration the two exported types, `BaseConfig` and
`Config` will be identical. From the CLI, use the flag
`--type-only-output FILE_NAME`.
