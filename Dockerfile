# Use a imagem oficial do Node.js baseada em Alpine para a etapa de build
FROM node:20-alpine AS builder

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia os arquivos de dependência
COPY package.json package-lock.json* ./

# Instala as dependências
RUN npm install

# Copia o restante dos arquivos do projeto
COPY . .
# Aceita variáveis de ambiente no momento do build (Vite precisa delas no build-time)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_API_URL

# O cliente Supabase aceita VITE_SUPABASE_ANON_KEY ou VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
ENV VITE_API_URL=$VITE_API_URL

# Constrói o aplicativo para produção (isso criará a pasta dist/)
RUN npm run build

# Etapa 2: Servir o aplicativo com Nginx
FROM nginx:alpine

# Remove o site padrão do Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copia os arquivos construídos da etapa anterior para o diretório do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia uma configuração personalizada do Nginx para suportar React Router SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expõe a porta 80 (porta padrão do Nginx)
EXPOSE 80

# Inicia o Nginx em primeiro plano
CMD ["nginx", "-g", "daemon off;"]
