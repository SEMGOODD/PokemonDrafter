import { AppEnv, TeamColor } from '../app/core/env/app-env';

export function createColorAppEnv(teamColor: TeamColor): AppEnv {
  return {
    COLOR: teamColor,
    GATEWAY_URL: 'http://gateway.test',
    KEYCLOAK_URL: 'http://kc.test',
    KEYCLOAK_REALM: 'realm',
    KEYCLOAK_CLIENT_ID: 'client',
    FRONT_GENERAL_URL: 'http://general.test',
    CHAT_WS_URL: 'ws://chat.test'
  };
}
