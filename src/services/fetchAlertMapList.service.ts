import { PrismaClient } from '@prisma/client/storage/client.js';
import { HttpClientUtil, loggerUtil, BasicAndBearerStrategy } from "../../expressium/index.js";
import { IAlertMap } from './interfaces/index.js';

const QUERY_GATEWAY_API_V1_GET_AUTHENTICATION_URL = `http://192.168.2.103:3042/api/v1/get/authentication`;
const QUERY_GATEWAY_API_V1_CREATE_QUERY_DATA_URL = `http://192.168.2.103:3042/api/v1/create/query-data`;
const TRIGGER_TRESHOLD = 50;

const prisma = new PrismaClient();

const sendMessage = async (alertMapList: IAlertMap.IAlertMap[]): Promise<void> => {
  try {
    const httpClientInstance = new HttpClientUtil.HttpClient();
    const messageHeader = '📌 *ALERTA (CERCA)* 📌\n\n';

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

    await httpClientInstance.post<unknown>(
      `https://v5.chatpro.com.br/${ process.env.CHAT_PRO_INSTANCE_ID }/api/v1/send_message`,
      {
        message: messageHeader + messageContentList.join('\n\n'),
        number: process.env.CHAT_PRO_NUMBER
      },
      { 
        headers: { Authorization: process.env.CHAT_PRO_BEARER_TOKEN },
        params: { instance_id: process.env.CHAT_PRO_INSTANCE_ID }
      }
    );
  } catch (error: unknown) {
    loggerUtil.error(error instanceof Error ? error.message : String(error));
  }
};

const processAlertMapList = async (alertMapListA: IAlertMap.IAlertMap[]): Promise<void> => {
  const alertMapListB: IAlertMap.IAlertMap[] = [];

  await Promise.allSettled(
    alertMapListA.map(
      async (alertMap: IAlertMap.IAlertMap): Promise<void> => {
        const key = `${ alertMap.account_code }-${ alertMap.zone_name }`;
        const fenceTrackerTrigger = await prisma.fence_tracker_triggers.findUnique({ where: { key }});
        const alertMapQuantityMultiple = Math.floor(alertMap.quantity / TRIGGER_TRESHOLD) * TRIGGER_TRESHOLD;

        if (!fenceTrackerTrigger && alertMap.quantity >= TRIGGER_TRESHOLD) {
          await prisma.fence_tracker_triggers.create(
            { 
              data: { 
                key,
                quantity: alertMapQuantityMultiple
              } 
            }
          );

          alertMapListB.push(alertMap);
        } else if (fenceTrackerTrigger && alertMapQuantityMultiple > fenceTrackerTrigger.quantity) {
          await prisma.fence_tracker_triggers.update(
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
    await sendMessage(alertMapListB);
  }
};

export const fetchAlertMapList = async (): Promise<void> => {
  try {
    const httpClientInstance = new HttpClientUtil.HttpClient();

    httpClientInstance.setAuthenticationStrategy(
      new BasicAndBearerStrategy.BasicAndBearerStrategy(
        'get',
        QUERY_GATEWAY_API_V1_GET_AUTHENTICATION_URL,
        process.env.QUERY_GATEWAY_USERNAME as string,
        process.env.QUERY_GATEWAY_PASSWORD as string,
        undefined,
        undefined,
        undefined,
        (response: Axios.AxiosXHR<any>): string => response.data.data.token,
        (response: Axios.AxiosXHR<any>): number => response.data.data.expiresIn
      )
    );

    const alertMapList = (
      await httpClientInstance.post<any>(
        QUERY_GATEWAY_API_V1_CREATE_QUERY_DATA_URL, 
        { filterMap: { name: 'fence_alert_get_alert_map_list' } }
      )
    ).data?.data?.fence_alert_get_alert_map_list?.data;
    
    if (alertMapList) {
      await processAlertMapList(alertMapList);
    }
  } catch (error: unknown) {
    loggerUtil.error(error instanceof Error ? error.message : String(error));
  }
};
