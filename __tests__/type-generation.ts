import {
    inferStringTypeOfValue,
    inferStringTypeOfMultipleValues,
} from '../src/type-generation';

describe('Test Type Generation', () => {
    test('infer primitive types correctly', () => {
        expect(inferStringTypeOfValue('')).toEqual('string');
        expect(inferStringTypeOfValue(0)).toEqual('number');
        expect(inferStringTypeOfValue(true)).toEqual('boolean');
        expect(inferStringTypeOfValue(null)).toEqual('null');
        expect(inferStringTypeOfValue(undefined)).toEqual('undefined');
    });

    test('infer of invalid values fails', () => {
        expect(() => {
            inferStringTypeOfValue(() => {});
        }).toThrow();
        expect(() => {
            inferStringTypeOfValue(Symbol.hasInstance);
        }).toThrow();
    });

    test('infer simple array types correctly', () => {
        expect(inferStringTypeOfValue([])).toEqual('unknown[]');
        expect(inferStringTypeOfValue([''])).toEqual('string[]');
        expect(inferStringTypeOfValue(['', ''])).toEqual('string[]');
        expect(inferStringTypeOfValue([true])).toEqual('boolean[]');
        expect(inferStringTypeOfValue([true, 0])).toEqual(
            '(boolean | number)[]'
        );
    });

    test('infer simple object types correctly', () => {
        expect(inferStringTypeOfValue({})).toEqual('{}');
        expect(inferStringTypeOfValue({ a: 0, b: null })).toEqual(`{
    "a": number,
    "b": null
}`);
    });

    test('infer complex types correctly', () => {
        expect(
            inferStringTypeOfValue([{ a: 0 }, { b: true }, { a: '', b: true }])
        ).toEqual(`{
    "a": (number | undefined | string),
    "b": (undefined | boolean)
}[]`);
        expect(inferStringTypeOfValue([[''], []])).toEqual('string[][]');
    });

    test('infer multiple values type correctly', () => {
        expect(
            inferStringTypeOfMultipleValues([
                { a: 0 },
                { b: true },
                { a: '', b: true },
            ])
        ).toEqual(`{
    "a": (number | undefined | string),
    "b": (undefined | boolean)
}`);
    });
});
