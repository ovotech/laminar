import { HttpApp, yaml, ok, HttpServer, ResponseParser, defaultResponseParsers, start } from '@ovotech/laminar';

// << app

import * as YAML from 'yaml';

const app: HttpApp = async () => yaml(ok({ body: { example: { test: 'msg' } } }));

const yamlParser: ResponseParser = {
  match: (contentType) => contentType === 'application/yaml',
  parse: (yaml) => YAML.stringify(yaml),
};

const server = new HttpServer({
  app,
  /**
   * You can configure the response parsers using `responseParsers`
   * If we want to keep all the default ones though, so we pass the default body parsers first
   */
  responseParsers: [...defaultResponseParsers, yamlParser],
});

// app

start([server], console);
