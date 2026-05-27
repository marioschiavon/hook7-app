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
