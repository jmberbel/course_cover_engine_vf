FROM nginx:alpine
COPY course_cover_engine_vf.html /usr/share/nginx/html/index.html
EXPOSE 80
