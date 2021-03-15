import { parseCookie } from '../src';

describe('cookie parse', () => {
  test('basic', function () {
    expect(parseCookie('foo=bar')).toEqual({ foo: 'bar' });
    expect(parseCookie('foo=123')).toEqual({ foo: '123' });
  });

  test('ignore spaces', function () {
    expect(parseCookie('FOO    = bar;   baz  =   raz')).toEqual({ FOO: 'bar', baz: 'raz' });
  });

  test('escaping', function () {
    expect(parseCookie('foo="bar=123456789&name=Magic+Mouse"')).toEqual({ foo: 'bar=123456789&name=Magic+Mouse' });

    expect(parseCookie('email=%20%22%2c%3b%2f')).toEqual({ email: ' ",;/' });
  });

  test('ignore escaping error and return original value', function () {
    expect(parseCookie('foo=%1;bar=bar')).toEqual({ foo: '%1', bar: 'bar' });
  });

  test('ignore non values', function () {
    expect(parseCookie('foo=%1;bar=bar;HttpOnly;Secure')).toEqual({ foo: '%1', bar: 'bar' });
  });

  test('dates', function () {
    expect(parseCookie('priority=true; expires=Wed, 29 Jan 2014 17:43:25 GMT; Path=/')).toEqual({
      priority: 'true',
      Path: '/',
      expires: 'Wed, 29 Jan 2014 17:43:25 GMT',
    });
  });

  test('missing value', function () {
    expect(parseCookie('foo; bar=1; fizz= ; buzz=2')).toEqual({ bar: '1', fizz: '', buzz: '2' });
  });

  test('assign only once', function () {
    expect(parseCookie('foo=%1;bar=bar;foo=boo')).toEqual({ foo: '%1', bar: 'bar' });
    expect(parseCookie('foo=false;bar=bar;foo=true')).toEqual({ foo: 'false', bar: 'bar' });
    expect(parseCookie('foo=;bar=bar;foo=boo')).toEqual({ foo: '', bar: 'bar' });
  });
});
