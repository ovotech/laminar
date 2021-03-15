import { HttpService, jsonOk, run } from '@ovotech/laminar';
import axios from 'axios';
import { join } from 'path';
import { openApiTyped } from './__generated__/loss';

describe('Statements', () => {
  it('Should process response', async () => {
    const listener = await openApiTyped({
      api: join(__dirname, 'loss.yaml'),
      paths: {
        '/accounts/{accountId}/meters': {
          get: async () =>
            jsonOk([
              {
                meterType: 'gas',
                mpxn: '111111111',
                plan: 'PA_G_WM_R_25',
                tariffName: 'SMART PAYG (all online)',
                startDate: '2019-01-04',
                endDate: '2019-06-02',
                msn: 'G4111111',
                ldz: 'WM',
                address: '87, TEST AVENUE, TEST TOWN',
                postCode: 'TT123EE',
              },
              {
                meterType: 'elec',
                mpxn: '14111111',
                plan: 'PA_E_14_R_1_25',
                tariffName: 'SMART PAYG (all online)',
                startDate: '2019-01-04',
                endDate: '2019-06-02',
                msn: '222222222',
                profileClassId: '01',
                meterTimeswitchCode: '801',
                lineLossFactorClassId: '1',
                address: '87, TEST AVENUE, LOW HILL, TEST TOWN, WEST MIDLANDS',
                postCode: 'TT123EE',
              },
            ]),
        },
      },
    });
    const http = new HttpService({ listener, port: 4910 });
    await run({ services: [http] }, async () => {
      const api = axios.create({ baseURL: 'http://localhost:4910' });
      const { data } = await api.get('/accounts/123/meters');

      expect(data).toMatchSnapshot();
    });
  });
});
