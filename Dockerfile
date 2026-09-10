# Imagen base liviana de Node.js
FROM node:22-alpine

# Directorio de trabajo en el contenedor
WORKDIR /app

# Copiar archivos de definición de dependencias
COPY package*.json ./

# Instalar dependencias para producción
RUN npm install --omit=dev

# Copiar el resto del código del proyecto
COPY . .

# Exponer el puerto 3000 de la aplicación
EXPOSE 3000

# Comando de inicio del servidor
CMD ["node", "src/server.js"]
