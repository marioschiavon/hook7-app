/**
 * Hook7 WhatsApp API Service
 * Serviço centralizado para todas as chamadas à Hook7 API (motor Evolution API)
 *
 * No Evolution API todas as rotas carregam o nome da instância no path e são
 * autenticadas pelo header `apikey` com o token da instância.
 */

const EVOLUTION_API_URL = import.meta.env.VITE_API_URL || 'https://api.hook7.com.br';

export interface Hook7ConnectionState {
  instance: {
    instanceName: string;
    state: 'open' | 'close' | 'connecting';
  };
}

export interface Hook7QRCode {
  qrCode?: string;
  rawCode?: string;
  pairingCode?: string;
}

// Normalizar resposta de conexão para manter compatibilidade
export interface NormalizedConnectionStatus {
  status: boolean;
  message: string;
  qrCode?: string;
  pairingCode?: string;
}

/**
 * O Evolution API devolve o QR Code em base64. Dependendo da versão o valor já
 * vem com o prefixo `data:image/png;base64,` — normalizamos para uso em <img src>.
 */
const normalizeQrCode = (base64?: string | null): string | undefined => {
  if (!base64) return undefined;
  return base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
};

/**
 * Verificar estado da conexão de uma instância
 */
export const checkConnection = async (
  instanceName: string,
  apiKey: string
): Promise<NormalizedConnectionStatus> => {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/connectionState/${encodeURIComponent(instanceName)}`,
      {
        headers: {
          'apikey': apiKey
        }
      }
    );

    if (!response.ok) {
      return { status: false, message: 'Offline' };
    }

    const data: Hook7ConnectionState = await response.json();
    // Evolution API: `open` = WhatsApp autenticado, `connecting` = aguardando
    // leitura do QR Code, `close` = desconectado.
    const state = data?.instance?.state;

    if (state === 'open') {
      return { status: true, message: 'CONNECTED' };
    }
    if (state === 'connecting') {
      return { status: false, message: 'QRCODE' };
    }
    return { status: false, message: 'Disconnected' };
  } catch (error) {
    console.error('Erro ao verificar conexão:', error);
    return { status: false, message: 'Offline' };
  }
};

/**
 * Conectar instância e obter QR Code
 */
export const connectInstance = async (
  instanceName: string,
  apiKey: string
): Promise<Hook7QRCode | null> => {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/connect/${encodeURIComponent(instanceName)}`,
      {
        headers: {
          'apikey': apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao conectar: ${response.status}`);
    }

    const data: any = await response.json();
    return {
      qrCode: normalizeQrCode(data?.base64),
      rawCode: data?.code ?? undefined,
      pairingCode: data?.pairingCode ?? undefined,
    };
  } catch (error) {
    console.error('Erro ao conectar instância:', error);
    throw error;
  }
};

/**
 * Buscar QR Code atual
 *
 * No Evolution API não existe endpoint separado de QR Code: o próprio
 * /instance/connect devolve o código atualizado a cada chamada.
 */
export const fetchQRCode = async (
  instanceName: string,
  apiKey: string
): Promise<Hook7QRCode | null> => {
  try {
    return await connectInstance(instanceName, apiKey);
  } catch (error) {
    console.error('Erro ao buscar QR Code:', error);
    return null;
  }
};

/**
 * Logout completo da instância (desvincula o WhatsApp; reconectar exige novo QR Code)
 */
export const logoutInstance = async (
  instanceName: string,
  apiKey: string
): Promise<boolean> => {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/logout/${encodeURIComponent(instanceName)}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': apiKey
        }
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    return false;
  }
};

/**
 * Deletar uma instância completamente
 */
export const deleteInstance = async (
  instanceName: string,
  apiKey: string
): Promise<boolean> => {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/delete/${encodeURIComponent(instanceName)}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': apiKey
        }
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Erro ao deletar instância:', error);
    return false;
  }
};

/**
 * Interface para instância retornada pelo fetchInstances
 */
export interface Hook7InstanceInfo {
  name: string;
  token: string;
  status?: string;
}

/**
 * Buscar todas as instâncias (usado para recuperar token de instância existente)
 * Requer a Global API Key
 */
export const fetchInstances = async (
  globalApiKey: string
): Promise<Hook7InstanceInfo[]> => {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/fetchInstances`,
      {
        headers: {
          'apikey': globalApiKey
        }
      }
    );

    if (!response.ok) {
      console.error('Erro ao buscar instâncias:', response.status);
      return [];
    }

    const data = await response.json();

    // O Evolution API retorna um array de instâncias que, dependendo da versão,
    // vem achatado ou aninhado em `instance`.
    if (Array.isArray(data)) {
      return data.map((entry: any) => {
        const instance = entry?.instance ?? entry;
        return {
          name: instance.name || instance.instanceName,
          token: instance.token || instance.apikey || instance.hash?.apikey || instance.hash,
          status: instance.status || instance.connectionStatus
        };
      });
    }

    return [];
  } catch (error) {
    console.error('Erro ao buscar instâncias:', error);
    return [];
  }
};

/**
 * Verificar se o token tem formato válido da Hook7 API
 * Tokens válidos são UUIDs no formato: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
export const isValidHook7Token = (token: string | null | undefined): boolean => {
  if (!token) return false;
  // UUID pattern para Hook7 API tokens
  const uuidPattern = /^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i;
  return uuidPattern.test(token);
};

/**
 * Enviar mensagem de texto
 */
export const sendText = async (
  instanceName: string,
  apiKey: string,
  phoneNumber: string,
  text: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(instanceName)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey
        },
        body: JSON.stringify({
          number: phoneNumber,
          text: text
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error?.message || data.error || 'Erro ao enviar mensagem'
      };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Erro ao enviar mensagem via Hook7 API:', error);
    return { success: false, error: error.message || 'Erro de conexão' };
  }
};

export interface GroupInfo {
  id: string;
  subject: string;
  subjectOwner?: string;
  subjectTime?: number;
  size?: number;
  creation?: number;
  owner?: string;
  desc?: string;
  restrict?: boolean;
  announce?: boolean;
  participants?: any[];
}

/**
 * Buscar todos os grupos que a instância tem acesso
 */
export const fetchAllGroups = async (
  instanceName: string,
  apiKey: string
): Promise<{ success: boolean; data?: GroupInfo[]; error?: string }> => {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/group/fetchAllGroups/${encodeURIComponent(instanceName)}?getParticipants=false`,
      {
        method: 'GET',
        headers: {
          'apikey': apiKey
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error?.message || data.error || 'Erro ao buscar grupos'
      };
    }

    // O Evolution API retorna um array de grupos (ou objeto com .data em algumas versões)
    const groups = Array.isArray(data) ? data : data.data || [];

    return { success: true, data: groups };
  } catch (error: any) {
    console.error('Erro ao buscar grupos via Hook7 API:', error);
    return { success: false, error: error.message || 'Erro de conexão' };
  }
};

/**
 * Criar uma nova instância no Evolution API
 * Requer o Token Global (AUTHENTICATION_API_KEY)
 */
export const createInstance = async (
  instanceName: string,
  instanceToken: string,
  globalApiKey: string = ''
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/create`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': globalApiKey || instanceToken
        },
        body: JSON.stringify({
          instanceName: instanceName,
          token: instanceToken,
          qrcode: false,
          integration: 'WHATSAPP-BAILEYS'
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error?.message || data.error || 'Erro ao criar instância'
      };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Erro ao criar instância via Hook7 API:', error);
    return { success: false, error: error.message || 'Erro de conexão' };
  }
};
