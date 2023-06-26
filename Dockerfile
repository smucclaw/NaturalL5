FROM node AS build

WORKDIR /app

COPY . .
WORKDIR web
RUN npm install
RUN npm run build

FROM nginx

# WORKDIR /app
# COPY /app/build /usr/share/nginx/html
# RUN cp -r /app/build /usr/share/nginx/html

COPY --from=build /app/web/build /usr/share/nginx/html
COPY ./default.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
