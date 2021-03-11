import { HttpApp, HttpServer, jsonOk, start } from '@ovotech/laminar';

// << app

/**
 * Returns the url path being accessed
 */
const app: HttpApp = async ({ incommingMessage }) => jsonOk({ accessedUrl: incommingMessage.url });

// app

const main = async () => {
  const server = new HttpServer({ app });
  await start([server], console);
};

main();
