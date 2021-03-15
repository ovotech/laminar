export interface EnvVars {
  SECRET: string;
  PG: string;
  HOST: string;
  PORT: string;
}

export const toEnvVars = ({ SECRET, PG, HOST = 'localhost', PORT = '3344' }: NodeJS.ProcessEnv): EnvVars => {
  if (SECRET === undefined) {
    throw new Error('Need SECRET env variable');
  }
  if (PG === undefined) {
    throw new Error('Need PG env variable');
  }
  return { SECRET, PG, HOST, PORT };
};
