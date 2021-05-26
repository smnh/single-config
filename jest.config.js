module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testRegex: "((?!dist)....)/__tests__/.*\\.ts$",
    collectCoverage: true,
    collectCoverageFrom: ['**/index.ts', '**/config-mapper.ts', '**/type-generation.ts']
};
