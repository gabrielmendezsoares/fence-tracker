import momentTimezone from 'moment-timezone';
import { PrismaClient } from '@prisma/client/storage/client.js';
import { HttpClientUtil, loggerUtil, BasicAndBearerStrategy } from "../../expressium/index.js";
import { IAlertMap } from './interfaces/index.js';

const QUERY_GATEWAY_API_V1_GET_AUTHENTICATION_URL = `http://192.168.2.103:3042/api/v1/get/authentication`;
const QUERY_GATEWAY_API_V1_CREATE_QUERY_DATA_URL = `http://192.168.2.103:3042/api/v1/create/query-data`;
const EVENTS_COUNT_THRESHOLD = 50;

const prisma = new PrismaClient();

export const createAlerts = async (): Promise<void> => {
  try {
    const date = momentTimezone.tz('America/Sao_Paulo');

    if (date.hours() < 12) {
      await prisma.fence_tracker_triggers.deleteMany({ where: { updated_at: { lt: date.clone().hours(0).minutes(0).seconds(0).toDate() } } });
    } else {
      await prisma.fence_tracker_triggers.deleteMany({ where: { updated_at: { lt: date.clone().hours(12).minutes(0).seconds(0).toDate() } } });
    }

    const queryGatewayHttpClientInstance = new HttpClientUtil.HttpClient();

    queryGatewayHttpClientInstance.setAuthenticationStrategy(
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

    const alertMapListA = (
      await queryGatewayHttpClientInstance.post<any>(
        QUERY_GATEWAY_API_V1_CREATE_QUERY_DATA_URL, 
        { filterMap: { name: 'fence_tracker_get_alert_map_list' } }
      )
    ).data?.data?.fence_tracker_get_alert_map_list;
    
    if (!alertMapListA) {
      return;
    }

    const alertMapListB: IAlertMap.IAlertMap[] = [];

    await Promise.allSettled(
      alertMapListA.map(
        async (alertMap: IAlertMap.IAlertMap): Promise<void> => {
          const key = `${ alertMap.account_code }-${ alertMap.zone_name }`;
          const fenceTrackerTrigger = await prisma.fence_tracker_triggers.findUnique({ where: { key }});
          const alertMapQuantityMultiple = Math.floor(alertMap.quantity / EVENTS_COUNT_THRESHOLD) * EVENTS_COUNT_THRESHOLD;
  
          if (!fenceTrackerTrigger && alertMap.quantity >= EVENTS_COUNT_THRESHOLD) {
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
  
    if (!alertMapListB.length) {
      return;
    }

    const whatsAppHttpClientInstance = new HttpClientUtil.HttpClient();

    const messageContentList = alertMapListB.map(
      (alertMap: IAlertMap.IAlertMap): string => {
        return [
          `*Conta:* ${ alertMap.account_code }`,
          `*Condomínio:* ${ alertMap.condominium }`,
          `*Armário:* ${ alertMap.cabinet }`,
          `*Zona:* ${ alertMap.zone_name }`,
          `*Quantidade:* ${ alertMap.quantity }`
        ].join('\n');
      }
    );

    let startDateFormattation;
    let endDateFormattation;

    if (date.hours() < 12) {
      startDateFormattation = date.clone().hours(0).minutes(0).seconds(0);
      endDateFormattation = date.clone().hours(11).minutes(59).seconds(59);
    } else {
      startDateFormattation = date.clone().hours(12).minutes(0).seconds(0);
      endDateFormattation = date.clone().hours(23).minutes(59).seconds(59);
    }

    await whatsAppHttpClientInstance.post<unknown>(
      `https://v5.chatpro.com.br/${ process.env.CHAT_PRO_INSTANCE_ID }/api/v1/send_message`,
      {
        message: `⚠️ *ALERTA CERCA* ⚠️\n\n${ messageContentList.join('\n\n') }\n\n*Período Inicial:* ${ startDateFormattation }\n*Período Final:* ${ endDateFormattation }`,
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
