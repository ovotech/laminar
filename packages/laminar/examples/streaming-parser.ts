import { HttpService, HttpListener, BodyParser, defaultBodyParsers, csv, ok, init } from '@ovotech/laminar';
import { pipeline, Readable, Transform } from 'stream';
import * as parse from 'csv-parse';
import * as stringify from 'csv-stringify';

const csvParser: BodyParser = {
  name: 'CsvParser',
  match: /text\/csv/,
  parse: async (body) => body,
};

const upperCaseTransform = new Transform({
  objectMode: true,
  transform: (row: string[], encoding, callback) =>
    callback(
      undefined,
      row.map((item) => item.toUpperCase()),
    ),
});

/**
 * A function that will convert a readable stream of a csv into one with all items upper cased.
 * Using node's [pipeline](https://nodejs.org/api/stream.html#stream_stream_pipeline_streams_callback) function to handle the streams
 */
const transformCsv = (body: Readable): Readable =>
  pipeline(body, parse(), upperCaseTransform, stringify(), (err) => (err ? console.error(err.message) : undefined));

const listener: HttpListener = async ({ body }) => csv(ok({ body: transformCsv(body) }));

const http = new HttpService({
  listener,
  bodyParsers: [csvParser, ...defaultBodyParsers],
});

init({ services: [http], logger: console });
