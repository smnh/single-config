#!/usr/bin/env node

const ArgumentParser = require('argparse').ArgumentParser;
const configMapper = require('./index');

const parser = new ArgumentParser({
    version: '1.0.0',
    addHelp: true,
    description: 'Builds a module (default: config.js) from a single json configuration file (default: config.json) ' +
    'by picking leaf nodes matching the current NODE_ENV ("prod" mapped to "production", "dev" mapped to "development"). ' +
    'For more info visit https://github.com/smnh/buildconfig'
});

parser.addArgument(['-i', '--input'], {
    defaultValue: './config.json',
    help: 'The file path of the input json relative to the current working directory, default: ./config.json'
});

parser.addArgument(['-o', '--output'], {
    defaultValue: './config.js',
    help: 'The file path of the output module relative to the current working directory, default: ./config.js'
});

const args = parser.parseArgs();
const inputFilename = args.input;
const outputFilename = args.output;

configMapper.buildConfig(inputFilename, outputFilename);
