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
    
    if (!alertMapListA?.length) {
      return;
    }

    const date = momentTimezone.tz('America/Sao_Paulo');
    const whatsAppHttpClientInstance = new HttpClientUtil.HttpClient();
    const startDateFormattation = date.hours() < 12 ? date.clone().hours(0).minutes(0).seconds(0).format('DD/MM/YYYY HH:mm:ss') : date.clone().hours(12).minutes(0).seconds(0).format('DD/MM/YYYY HH:mm:ss');
    const endDateFormattation = date.hours() < 12 ? date.clone().hours(11).minutes(59).seconds(59).format('DD/MM/YYYY HH:mm:ss') : date.clone().hours(23).minutes(59).seconds(59).format('DD/MM/YYYY HH:mm:ss');

    await Promise.allSettled(
      alertMapListA.map(
        async (alertMap: IAlertMap.IAlertMap): Promise<void> => {
          const alertMapAccountCode = alertMap.account_code;
          const alertMapZoneName = alertMap.zone_name;
          const alertMapQuantity = alertMap.quantity;

          const fenceTrackerRegister = await prisma.fence_tracker_registers.findUnique(
            { 
              where: { 
                account_code_zone_name_period_started_at_period_ended_at: {
                  account_code: alertMapAccountCode,
                  zone_name: alertMapZoneName,
                  period_started_at: date.hours() < 12 ? date.clone().hours(0).minutes(0).seconds(0).toDate() : date.clone().hours(12).minutes(0).seconds(0).toDate(),
                  period_ended_at: date.hours() < 12 ? date.clone().hours(11).minutes(59).seconds(59).toDate() : date.clone().hours(23).minutes(59).seconds(59).toDate()
                }
              }
            }
          );

          const alertMapQuantityMultiple = Math.floor(alertMapQuantity / EVENTS_COUNT_THRESHOLD) * EVENTS_COUNT_THRESHOLD;
  
          if (!fenceTrackerRegister && alertMapQuantity >= EVENTS_COUNT_THRESHOLD) {
            await prisma.fence_tracker_registers.create(
              {
                data: {
                  account_code: alertMapAccountCode,
                  condominium: alertMap.condominium,
                  cabinet: alertMap.cabinet,
                  zone_name: alertMapZoneName,
                  quantity: alertMapQuantityMultiple,
                  period_started_at: date.hours() < 12 ? date.clone().hours(0).minutes(0).seconds(0).toDate() : date.clone().hours(12).minutes(0).seconds(0).toDate(),
                  period_ended_at: date.hours() < 12 ? date.clone().hours(11).minutes(59).seconds(59).toDate() : date.clone().hours(23).minutes(59).seconds(59).toDate()
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
          } else if (fenceTrackerRegister && alertMapQuantityMultiple > fenceTrackerRegister.quantity) {
            await prisma.fence_tracker_registers.update(
              {
                where: { id: fenceTrackerRegister.id },
                data: { quantity: alertMapQuantityMultiple }
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
          }
        }
      )
    );
  } catch (error: unknown) {
    loggerUtil.error(error instanceof Error ? error.message : String(error));
  }
};
