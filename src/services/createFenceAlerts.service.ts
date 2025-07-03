import momentTimezone from 'moment-timezone';
import { PrismaClient } from '@prisma/client/storage/client.js';
import { HttpClientUtil, BasicAndBearerStrategy } from "../../expressium/src/index.js";
import { IAlertMap } from './interfaces/index.js';

const MAXIMUM_QUANTITY = 50;

const prisma = new PrismaClient();

const sendNotification = async (alertMapList: IAlertMap.IAlertMap[]): Promise<void> => {
  try {
    const httpClientInstance = new HttpClientUtil.HttpClient();
    const messageHeader = '📌 *ALERTA (CERCA)* 📌\n\n';
    const messageSubHeader = `Período: ${ momentTimezone().utc().hour() < 12 ? '00:00 - 12:00' : '12:00 - 00:00' }\n\n`;

    const messageContentList = alertMapList.map(
      (alertMap: IAlertMap.IAlertMap): string => {
        return [
          `[${ alertMap.account_code }]`,
          `- Armário: ${ alertMap.cabinet }`,
          `- Condomínio: ${ alertMap.condominium }`,
          `- Quantidade: ${ alertMap.quantity }`,
          `- Zona: ${ alertMap.zone_name }`,
        ].join('\n');
      }
    );

    const message = messageHeader + messageSubHeader + messageContentList.join('\n\n');

    await httpClientInstance.post<unknown>(
      `https://v5.chatpro.com.br/${ process.env.CHAT_PRO_INSTANCE_ID }/api/v1/send_message`,
      {
        message,
        number: process.env.CHAT_PRO_NUMBER
      },
      { 
        headers: { Authorization: process.env.CHAT_PRO_BEARER_TOKEN },
        params: { instance_id: process.env.CHAT_PRO_INSTANCE_ID }
      }
    );
  } catch (error: unknown) {
    console.log(`Error | Timestamp: ${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } | Path: src/services/createFenceAlerts.service.ts | Location: sendNotification | Error: ${ error instanceof Error ? error.message : String(error) }`);
  }
};

const processFenceAlerts = async (alertMapListA: IAlertMap.IAlertMap[]): Promise<void> => {
  const alertMapListB: IAlertMap.IAlertMap[] = [];

  await Promise.allSettled(
    alertMapListA.map(
      async (alertMap: IAlertMap.IAlertMap): Promise<void> => {
        const key = `${ alertMap.account_code }-${ alertMap.zone_name }`;
        const fenceAlert = await prisma.fence_alerts.findUnique({ where: { key }});
        const alertMapQuantityMultiple = Math.floor(alertMap.quantity / MAXIMUM_QUANTITY) * MAXIMUM_QUANTITY;

        if (!fenceAlert && alertMap.quantity >= MAXIMUM_QUANTITY) {
          await prisma.fence_alerts.create(
            { 
              data: { 
                key,
                quantity: alertMapQuantityMultiple
              } 
            }
          );

          alertMapListB.push(alertMap);
        } else if (fenceAlert && alertMapQuantityMultiple > fenceAlert.quantity) {
          await prisma.fence_alerts.update(
            { 
              where: { key },
              data: { quantity: alertMapQuantityMultiple } 
            }
          );

          alertMapListB.push(alertMap);
        }
      }
    )
  );

  if (alertMapListB.length > 0) {
    await sendNotification(alertMapListB);
  }
};

export const createFenceAlerts = async (): Promise<void> => {
  try {
    const httpClientInstance = new HttpClientUtil.HttpClient();

    httpClientInstance.setAuthenticationStrategy(
      new BasicAndBearerStrategy.BasicAndBearerStrategy(
        'get',
        'http://localhost:3042/api/v1/get/authentication',
        process.env.QUERY_GATEWAY_USERNAME as string,
        process.env.QUERY_GATEWAY_PASSWORD as string,
        undefined,
        undefined,
        undefined,
        (response: Axios.AxiosXHR<any>): string => response.data.data.token,
        (response: Axios.AxiosXHR<any>): number => response.data.data.expiresIn
      )
    );

    const response = (
      await httpClientInstance.post<any>(
        'http://localhost:3042/api/v1/get/query-data-map',
        { filterMap: { name: 'fence_alert_get_alert_map_list' } }
      )
    ).data?.data?.fence_alert_get_alert_map_list;

    const alertMapList = response?.data;
    
    if (response?.status && alertMapList) {
      await processFenceAlerts(alertMapList);
    }
  } catch (error: unknown) {
    console.log(`Error | Timestamp: ${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } | Path: src/services/createFenceAlerts.service.ts | Location: createFenceAlerts | Error: ${ error instanceof Error ? error.message : String(error) }`);
  }
};
