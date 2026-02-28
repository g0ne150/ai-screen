# AI Screen Relay Server
# https://github.com/oven-sh/bun

FROM oven/bun:1-alpine

WORKDIR /app

# 复制依赖文件
COPY package.json bun.lock ./

# 安装依赖
RUN bun install --frozen-lockfile

# 复制源代码
COPY src ./src
COPY static/index.html ./static/index.html

# 创建数据目录和附件目录
RUN mkdir -p data static/attachments

# 暴露端口
EXPOSE 3000

# 数据卷（数据库和附件需要持久化）
VOLUME ["/app/data", "/app/static/attachments"]

# 启动服务
CMD ["bun", "run", "start"]
