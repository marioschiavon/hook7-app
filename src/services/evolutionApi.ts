/**
 * Hook7 WhatsApp API Service
 * Serviço centralizado para todas as chamadas à Evolution GO
 */

const EVOLUTION_API_URL = import.meta.env.VITE_API_URL || 'https://api.hook7.com.br';

export interface EvolutionConnectionState {
  instance: {
    instanceName: string;
    state: 'open' | 'close' | 'connecting';
  };
}

export interface EvolutionQRCode {
  base64?: string;
  pairingCode?: string;
  code?: string;
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
      `${EVOLUTION_API_URL}/instance/status`,
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
    const state = data?.instance?.state || data?.state;
    
    if (state === 'open') {
      return { status: true, message: 'CONNECTED' };
    } else if (state === 'connecting') {
      return { status: false, message: 'QRCODE' };
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
): Promise<EvolutionQRCode | null> => {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/connect`,
      {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          immediate: true
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao conectar: ${response.status}`);
    }

    const data: EvolutionQRCode = await response.json();
    return data;
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
): Promise<EvolutionQRCode | null> => {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/qr`,
      {
        headers: {
          'apikey': apiKey
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data: EvolutionQRCode = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar QR Code:', error);
    return null;
  }
};

/**
 * Desconectar/logout de uma instância
 */
export const logoutInstance = async (
  apiKey: string
): Promise<boolean> => {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/logout`,
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
      `${EVOLUTION_API_URL}/instance/delete/${instanceId}`,
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
export interface EvolutionInstanceInfo {
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
): Promise<EvolutionInstanceInfo[]> => {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/all`,
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
    
    // A Evolution API retorna um array de instâncias
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
 * Verificar se o token tem formato válido da Evolution API
 * Tokens válidos são UUIDs no formato: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
export const isValidEvolutionToken = (token: string | null | undefined): boolean => {
  if (!token) return false;
  // UUID pattern para Evolution API tokens
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
      `${EVOLUTION_API_URL}/send/text`,
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
    console.error('Erro ao enviar mensagem via Evolution API:', error);
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
      `${EVOLUTION_API_URL}/group/list`,
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

    // Evolution API geralmente retorna um array ou objeto com .data
    const groups = Array.isArray(data) ? data : data.data || [];
    
    return { success: true, data: groups };
  } catch (error: any) {
    console.error('Erro ao buscar grupos via Evolution API:', error);
    return { success: false, error: error.message || 'Erro de conexão' };
  }
};

/**
 * Criar uma nova instância na Evolution API
 * Requer o Token Global ou token genérico compatível
 */
export const createInstance = async (
  instanceName: string,
  instanceToken: string,
  globalApiKey: string = ''
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    // Nota: O endpoint de criação na Evolution GO pode usar o globalToken,
    // ou se aceitar o header 'apikey: instanceToken', mandamos o próprio token da instância gerado.
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/create`,
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
    console.error('Erro ao criar instância via Evolution API:', error);
    return { success: false, error: error.message || 'Erro de conexão' };
  }
};
