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

    const whatsAppHttpClientInstance = new HttpClientUtil.HttpClient();

    let startDateFormattation;
    let endDateFormattation;

    if (date.hours() < 12) {
      startDateFormattation = date.clone().hours(0).minutes(0).seconds(0);
      endDateFormattation = date.clone().hours(11).minutes(59).seconds(59);
    } else {
      startDateFormattation = date.clone().hours(12).minutes(0).seconds(0);
      endDateFormattation = date.clone().hours(23).minutes(59).seconds(59);
    }

    await Promise.allSettled(
      alertMapListA.map(
        async (alertMap: IAlertMap.IAlertMap): Promise<void> => {
          const alertMapAccountCode = alertMap.account_code;
          const alertMapZoneName = alertMap.zone_name;
          const alertMapQuantity = alertMap.quantity;

          const fenceTrackerTrigger = await prisma.fence_tracker_triggers.findUnique(
            { 
              where: { 
                account_code_zone_name: {
                  account_code: alertMapAccountCode,
                  zone_name: alertMapZoneName
                } 
              }
            }
          );

          const alertMapQuantityMultiple = Math.floor(alertMapQuantity / EVENTS_COUNT_THRESHOLD) * EVENTS_COUNT_THRESHOLD;

          const processAlertMap = async (): Promise<void> => {
            await prisma.fence_tracker_triggers.create(
              { 
                data: { 
                  account_code: alertMapAccountCode,
                  zone_name: alertMapZoneName,
                  quantity: alertMapQuantityMultiple
                } 
              }
            );
  
            await whatsAppHttpClientInstance.post<unknown>(
              `https://v5.chatpro.com.br/${ process.env.CHAT_PRO_INSTANCE_ID }/api/v1/send_message`,
              {
                message: `⚠️ *ALERTA CERCA* ⚠️\n\n*Conta:* ${ alertMapAccountCode }\n*Condomínio:* ${ alertMap.condominium }\n*Armário:* ${ alertMap.cabinet }\n*Zona:* ${ alertMapZoneName }\n*Quantidate*: ${ alertMapQuantityMultiple }\n*Período Inicial:* ${ startDateFormattation }\n*Período Final:* ${ endDateFormattation }`,
                number: process.env.CHAT_PRO_NUMBER
              },
              { 
                headers: { Authorization: process.env.CHAT_PRO_BEARER_TOKEN },
                params: { instance_id: process.env.CHAT_PRO_INSTANCE_ID }
              }
            );
          };
  
          if (!fenceTrackerTrigger && alertMapQuantity >= EVENTS_COUNT_THRESHOLD) {
            processAlertMap();
          } else if (fenceTrackerTrigger && alertMapQuantityMultiple > fenceTrackerTrigger.quantity) {
            processAlertMap();
          }
        }
      )
    );
  } catch (error: unknown) {
    loggerUtil.error(error instanceof Error ? error.message : String(error));
  }
};
