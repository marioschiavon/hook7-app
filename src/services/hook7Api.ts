/**
 * Hook7 WhatsApp API Service
 * Serviço centralizado para todas as chamadas à Hook7 API
 */

const HOOK7_GO_URL = import.meta.env.VITE_API_URL || 'https://api.hook7.com.br';

export interface Hook7ConnectionState {
  instance: {
    instanceName: string;
    state: 'open' | 'close' | 'connecting';
  };
}

export interface Hook7QRCode {
  qrCode?: string;
  rawCode?: string;
}

// Normalizar resposta de conexão para manter compatibilidade
export interface NormalizedConnectionStatus {
  status: boolean;
  message: string;
  qrCode?: string;
  pairingCode?: string;
}

/**
 * Verificar estado da conexão de uma instância
 */
export const checkConnection = async (
  apiKey: string
): Promise<NormalizedConnectionStatus> => {
  try {
    const response = await fetch(
      `${HOOK7_GO_URL}/instance/status`,
      {
        headers: {
          'apikey': apiKey
        }
      }
    );

    if (!response.ok) {
      return { status: false, message: 'Offline' };
    }

    const data: any = await response.json();
    // "Connected" só indica que o processo da instância está ativo no Evolution Go;
    // "LoggedIn" é que reflete se o WhatsApp está de fato autenticado/vinculado.
    const connected = data?.data?.Connected === true;
    const loggedIn = data?.data?.LoggedIn === true;

    if (connected && loggedIn) {
      return { status: true, message: 'CONNECTED' };
    } else {
      return { status: false, message: 'Disconnected' };
    }
  } catch (error) {
    console.error('Erro ao verificar conexão:', error);
    return { status: false, message: 'Offline' };
  }
};

/**
 * Conectar instância e obter QR Code
 */
export const connectInstance = async (
  apiKey: string
): Promise<Hook7QRCode | null> => {
  try {
    const response = await fetch(
      `${HOOK7_GO_URL}/instance/connect`,
      {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhookUrl: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`,
          subscribe: ['MESSAGE', 'SEND_MESSAGE', 'CONNECTION', 'QRCODE']
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao conectar: ${response.status}`);
    }

    // /instance/connect só registra o webhook; não retorna QR Code.
    await response.json().catch(() => null);
    return {};
  } catch (error) {
    console.error('Erro ao conectar instância:', error);
    throw error;
  }
};

/**
 * Buscar QR Code atual
 */
export const fetchQRCode = async (
  apiKey: string
): Promise<Hook7QRCode | null> => {
  try {
    const response = await fetch(
      `${HOOK7_GO_URL}/instance/qr`,
      {
        headers: {
          'apikey': apiKey
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data: any = await response.json();
    return {
      qrCode: data?.data?.qrcode ?? undefined,
      rawCode: data?.data?.code ?? undefined,
    };
  } catch (error) {
    console.error('Erro ao buscar QR Code:', error);
    return null;
  }
};

/**
 * Desconectar a instância (mantém o vínculo do WhatsApp; reconectar não exige novo QR Code)
 */
export const disconnectInstance = async (
  apiKey: string
): Promise<boolean> => {
  try {
    const response = await fetch(
      `${HOOK7_GO_URL}/instance/disconnect`,
      {
        method: 'POST',
        headers: {
          'apikey': apiKey
        }
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Erro ao desconectar instância:', error);
    return false;
  }
};

/**
 * Logout completo da instância (desvincula o WhatsApp; reconectar exige novo QR Code)
 */
export const logoutInstance = async (
  apiKey: string
): Promise<boolean> => {
  try {
    const response = await fetch(
      `${HOOK7_GO_URL}/instance/logout`,
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
  instanceId: string, 
  apiKey: string
): Promise<boolean> => {
  try {
    const response = await fetch(
      `${HOOK7_GO_URL}/instance/delete/${instanceId}`,
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
      `${HOOK7_GO_URL}/instance/all`,
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
    
    // A Hook7 API retorna um array de instâncias
    if (Array.isArray(data)) {
      return data.map((instance: any) => ({
        name: instance.name || instance.instanceName,
        token: instance.token || instance.apikey,
        status: instance.status
      }));
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
  apiKey: string,
  phoneNumber: string,
  text: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const response = await fetch(
      `${HOOK7_GO_URL}/send/text`,
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
        error: data.message || data.error || 'Erro ao enviar mensagem' 
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
  apiKey: string
): Promise<{ success: boolean; data?: GroupInfo[]; error?: string }> => {
  try {
    const response = await fetch(
      `${HOOK7_GO_URL}/group/list`,
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
        error: data.message || data.error || 'Erro ao buscar grupos' 
      };
    }

    // Hook7 API geralmente retorna um array ou objeto com .data
    const groups = Array.isArray(data) ? data : data.data || [];
    
    return { success: true, data: groups };
  } catch (error: any) {
    console.error('Erro ao buscar grupos via Hook7 API:', error);
    return { success: false, error: error.message || 'Erro de conexão' };
  }
};

/**
 * Criar uma nova instância na Hook7 API
 * Requer o Token Global ou token genérico compatível
 */
export const createInstance = async (
  instanceName: string,
  instanceToken: string,
  globalApiKey: string = ''
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    // Nota: O endpoint de criação na Hook7 API pode usar o globalToken,
    // ou se aceitar o header 'apikey: instanceToken', mandamos o próprio token da instância gerado.
    const response = await fetch(
      `${HOOK7_GO_URL}/instance/create`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': globalApiKey || instanceToken
        },
        body: JSON.stringify({
          instanceId: instanceName,
          name: instanceName,
          token: instanceToken
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: data.message || data.error || 'Erro ao criar instância' 
      };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Erro ao criar instância via Hook7 API:', error);
    return { success: false, error: error.message || 'Erro de conexão' };
  }
};
