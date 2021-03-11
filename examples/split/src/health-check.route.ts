import { AppRoute, jsonOk } from '@ovotech/laminar';

export const healthCheck: AppRoute = async () => jsonOk({ health: 'ok' });
