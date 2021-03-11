/**
 * @packageDocumentation
 * @module @ovotech/laminar-handlebars
 */

import { Middleware, HttpResponse, response } from '@ovotech/laminar';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { compile, RuntimeOptions, TemplateDelegate } from 'handlebars';
import { join, relative } from 'path';
import { OutgoingHttpHeaders } from 'http';
import { statSync } from 'fs';

export type Cache = Map<string, { template: TemplateDelegate; mtime: Date }>;

/**
 * Cache types.
 * - preload: load all the templates ones into memory
 * - expiry: load partials when needed and keep them in cache, but check the file's mtime and reload template if changed
 * - none: do not cache templates and load them on every request.
 */
export type CacheType = 'preload' | 'expiry' | 'none';

export interface TemplateConfig {
  helpers?: RuntimeOptions['helpers'];
  dir?: string;
  partials?: string;
  extension?: string;
  views?: string;
  cacheType?: CacheType;
  headers?: OutgoingHttpHeaders;
}

export interface CompileTemplatesOptions {
  dir: string;
  extension: string;
}

export type HandlebarsRender = (
  view: string,
  data?: Record<string, unknown>,
  options?: Partial<HttpResponse>,
) => HttpResponse;

export interface RequestHandlebars {
  hbs: HandlebarsRender;
}

const hasExtension = (extension: string) => (file: string): boolean => file.endsWith(extension);

export const deepReaddirSync = ({ dir, extension }: CompileTemplatesOptions): string[] =>
  readdirSync(dir, { withFileTypes: true })
    .reduce<string[]>((all, item) => {
      return all.concat(
        item.isDirectory() ? deepReaddirSync({ dir: join(dir, item.name), extension }) : join(dir, item.name),
      );
    }, [])
    .filter(hasExtension(extension));

const toName = (dir: string, file: string): string => relative(dir, file.slice(0, file.lastIndexOf('.')));

export const compileTemplates = ({ dir, extension }: CompileTemplatesOptions): Array<[string, TemplateDelegate]> =>
  deepReaddirSync({ dir, extension }).reduce<Array<[string, TemplateDelegate]>>(
    (all, file) => [...all, [toName(dir, file), compile(readFileSync(file, 'utf8'))]],
    [],
  );

export const loadTemplate = (
  name: string,
  cache: Cache,
  cacheType: CacheType,
  { dir, extension }: CompileTemplatesOptions,
): TemplateDelegate => {
  const file = `${join(dir, name)}.${extension}`;

  const stat = cacheType === 'expiry' ? statSync(file) : { mtime: new Date(0) };
  const cached = cache.get(name);

  if (cacheType !== 'none' && cached && stat.mtime < cached.mtime) {
    return cached.template;
  } else {
    const template = compile(readFileSync(file, 'utf8'));
    cache.set(name, { template, mtime: cacheType === 'expiry' ? stat.mtime : new Date() });
    return template;
  }
};

const loadPartials = (options: CompileTemplatesOptions): { [key: string]: TemplateDelegate } =>
  existsSync(options.dir)
    ? compileTemplates(options).reduce((acc, [name, template]) => ({ ...acc, [name]: template }), {})
    : {};

const loadTemplates = (cache: Cache, options: CompileTemplatesOptions): Cache =>
  existsSync(options.dir)
    ? compileTemplates(options).reduce(
        (cache, [name, template]) => cache.set(name, { template, mtime: new Date() }),
        cache,
      )
    : cache;

export const handlebars = ({
  helpers = {},
  dir = process.cwd(),
  extension = 'handlebars',
  partials = 'partials',
  views = 'views',
  cacheType = 'preload',
  headers,
}: TemplateConfig): HandlebarsRender => {
  const defaultHeaders = { 'content-type': 'text/html', ...headers };
  const cache = cacheType === 'preload' ? loadTemplates(new Map(), { dir, extension }) : new Map();
  const partialTemplates = cacheType === 'preload' ? loadPartials({ dir: join(dir, partials), extension }) : undefined;

  return (name, data = {}, options = {}) => {
    const template = loadTemplate(name, cache, cacheType, { dir: join(dir, views), extension });
    return response({
      body: template(data, {
        helpers,
        partials: partialTemplates ?? loadPartials({ dir: join(dir, partials), extension }),
      }),
      status: 200 as const,
      ...options,
      headers: { ...defaultHeaders, ...options.headers },
    });
  };
};

export const handlebarsMiddleware = (config: TemplateConfig): Middleware<RequestHandlebars> => {
  const hbs = handlebars(config);
  return (next) => (req) => next({ ...req, hbs });
};
