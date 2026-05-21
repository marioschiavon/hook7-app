/**
 * Hook7 WhatsApp API Service
 * Serviço centralizado para todas as chamadas à API de instâncias WhatsApp
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

export interface EvolutionInstance {
  instance: {
    instanceName: string;
    instanceId: string;
    status: string;
  };
  hash: {
    apikey: string;
  };
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
  instanceName: string, 
  apiKey: string
): Promise<NormalizedConnectionStatus> => {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`,
      {
        headers: {
          'apikey': apiKey
        }
      }
    );

    if (!response.ok) {
      return { status: false, message: 'Offline' };
    }

    const data: EvolutionConnectionState = await response.json();
    const state = data.instance?.state;
    
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
  instanceName: string, 
  apiKey: string
): Promise<EvolutionQRCode | null> => {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/connect/${instanceName}`,
      {
        headers: {
          'apikey': apiKey
        }
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
  instanceName: string, 
  apiKey: string
): Promise<EvolutionQRCode | null> => {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/connect/${instanceName}`,
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
  instanceName: string, 
  apiKey: string
): Promise<boolean> => {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/logout/${instanceName}`,
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
      `${EVOLUTION_API_URL}/instance/delete/${instanceName}`,
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
  instanceName: string,
  apiKey: string,
  number: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number,
          text
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Erro ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return { success: true, messageId: data.key?.id };
  } catch (error: any) {
    console.error('Erro ao enviar mensagem:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Enviar mídia (imagem, áudio, documento)
 */
export const sendMedia = async (
  instanceName: string,
  apiKey: string,
  number: string,
  mediaUrl: string,
  mediaType: 'image' | 'audio' | 'document',
  options?: { caption?: string; filename?: string }
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number,
          mediatype: mediaType,
          media: mediaUrl,
          caption: options?.caption,
          fileName: options?.filename
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Erro ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return { success: true, messageId: data.key?.id };
  } catch (error: any) {
    console.error('Erro ao enviar mídia:', error);
    return { success: false, error: error.message };
  }
};

// Export default object para uso conveniente
export const evolutionApi = {
  checkConnection,
  connectInstance,
  fetchQRCode,
  logoutInstance,
  deleteInstance,
  fetchInstances,
  isValidEvolutionToken,
  sendText,
  sendMedia
};

export default evolutionApi;
