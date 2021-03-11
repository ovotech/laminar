import { HttpApp, htmlInternalServerError, HttpServer, HttpErrorHandler, start } from '@ovotech/laminar';

// << app
const app: HttpApp = () => {
  throw new Error('Testing error');
};

const errorHandler: HttpErrorHandler = async ({ error }) => htmlInternalServerError(`<html>${error.message}</html>`);

const server = new HttpServer({
  app,
  /**
   * You can configure the default error handler with `errorHandler`
   */
  errorHandler,
});
// app

start([server], console);
