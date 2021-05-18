import { inferStringType } from '../src/type-generation';

describe('Test Type Generation', () => {
    test('infer primitive types correctly', () => {
        expect(inferStringType('')).toEqual('string');
        expect(inferStringType(0)).toEqual('number');
        expect(inferStringType(true)).toEqual('boolean');
        expect(inferStringType(null)).toEqual('null');
        expect(inferStringType(undefined)).toEqual('undefined');
    });

    test('infer of invalid values fails', () => {
        expect(() => {
            inferStringType(() => {});
        }).toThrow();
        expect(() => {
            inferStringType(Symbol.hasInstance);
        }).toThrow();
    });

    test('infer simple array types correctly', () => {
        expect(inferStringType([])).toEqual('unknown[]');
        expect(inferStringType([''])).toEqual('string[]');
        expect(inferStringType(['', ''])).toEqual('string[]');
        expect(inferStringType([true])).toEqual('boolean[]');
        expect(inferStringType([true, 0])).toEqual('(boolean | number)[]');
    });

    test('infer simple object types correctly', () => {
        expect(inferStringType({})).toEqual('{}');
        expect(inferStringType({ a: 0, b: null })).toEqual(`{
  "a": number,
  "b": null
}`);
    });

    test('infer complex types correctly', () => {
        expect(inferStringType([{ a: 0 }, { b: true }, { a: '', b: true }])).toEqual(`{
  "a": (number | undefined | string),
  "b": (undefined | boolean)
}[]`);
        expect(inferStringType([[''], []])).toEqual('string[][]');
    });
});
