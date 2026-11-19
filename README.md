# 超声影像库 (UsVault)

用于记录与检索超声图片（JPG/PNG）和视频（MP4/MOV）的单用户 Web 应用，支持 PWA（可添加到手机/电脑桌面），部署在飞牛 NAS 的 Docker 中，所有数据保存在 NAS 目录里。

## 功能
- 新建记录：检查日期、部位、标题、患者信息、诊断、标签、备注 + 拖拽上传多张图片/视频（带进度条）
- 自定义字段（⚙ 设置）：可添加 单行/多行文本、数字（带单位）、日期、单选、多选、是/否 字段，可调整顺序、停用、删除；可设置是否作为筛选条件、是否显示在卡片上；单选/多选的选项改名会同步到已有记录。内置字段可改名或隐藏
- 随访与复查时间线（📅 随访）：每条记录可设置下次随访日期（支持 +1个月/+3个月/+6个月/+1年 快捷推算）与随访备注；顶部红点角标与首页横幅按「已逾期 / N天内到期」提醒（提前天数可在设置中调整）；支持一键「录入复查」自动串成复查时间线，提供「并排对比」视图对比历次诊断、自定义测量值与影像，并支持手动关联已有记录
- 检索：关键词（多个关键词用空格分隔，匹配所有文字字段、自定义字段与文件名）+ 日期范围 + 部位 + 类型 + 标签 + 自定义字段筛选
- 查看：缩略图网格、全屏查看大图（点击放大）、视频播放（支持拖动进度），左右键/手机滑动切换，下载原文件
- 视频自动转码：设备导出的视频如果不是 H.264（如 MPEG-4、HEVC），后台自动生成浏览器可播放的副本；下载时仍是原文件
- 删除不会真正删除文件，而是移到 `trash/` 目录，防止误删
- 单用户密码登录（30 天免登录）

## 数据目录结构（在 NAS 上）
```
超声影像库/
├── usvault.db                 # SQLite 数据库（记录信息）
├── media/2026/11/R000001/     # 原始文件，按 检查年/月/记录编号 存放，可在 NAS 文件管理器里直接浏览
├── thumbs/                    # 缩略图（可删除后重建）
├── web/                       # 非 H.264 视频自动转码出的可播放副本（原文件不动）
├── trash/                     # 被删除的文件
└── .secret                    # 登录签名密钥
```
> 备份时整个目录一起备份即可（建议开启飞牛的快照/备份）。

## 部署到飞牛 fnOS（推荐：GitHub 自动打包 + 飞牛一键更新）

### 第一次配置（只需做一次）
1. **推送代码到 GitHub**
   - 在 GitHub 新建一个名为 `usvault` 的仓库（公开或私有都可以）。
   - 在本机项目目录执行：
     ```bash
     git remote add origin https://github.com/<你的GitHub用户名>/usvault.git
     git push -u origin main
     ```
   - 推送后，GitHub 仓库顶部的 **Actions** 会自动开始构建 Docker 镜像（约 1 分钟），构建完成后会自动推送到 `ghcr.io/<你的github用户名>/usvault:latest`。

2. **设置镜像访问权限**
   - **公开镜像（最省事）**：进入 GitHub 仓库右侧 **Packages → usvault → Package settings → Change visibility** 设为 `Public`（代码不含任何密码或医疗数据，只是通用程序）。
   - **保持私有镜像**：在 GitHub 右上角 **Settings → Developer settings → Personal access tokens (classic)** 生成一个带 `read:packages` 权限的 Token，在飞牛 **Docker → 镜像仓库** 里添加/登录 `ghcr.io`（用户名填 GitHub 用户名，密码填 Token）。

3. **在飞牛 NAS 启动**
   - 在飞牛文件管理里创建数据目录（例如 `超声影像库`），记下真实路径（如 `/vol1/1000/超声影像库`）。
   - 打开飞牛 **Docker → Compose → 新增项目**，直接把本项目 `docker-compose.yml` 的内容粘贴进去，修改：
     - `image` 中的 `<你的github用户名>`（全部小写）
     - `APP_PASSWORD`（你的登录密码）
     - `volumes` 左侧的 NAS 路径
   - 点击构建并启动，浏览器访问 `http://NAS的IP:8080`。

### 以后怎么更新
1. 在 Mac 上改完代码后执行 `git push`。
2. 等 1 分钟左右 GitHub Actions 构建变绿。
3. 在飞牛 **Docker → Compose → usvault** 点一下 **「更新 / 重新拉取镜像并重建」**（或重启前勾选拉取最新镜像）。
4. 刷新网页，进入 **⚙ 字段设置** 最底部可以看到「当前版本」已更新为新日期与 commit 号；所有数据都在 `/data` 目录里，不会丢失。

### 可选：国内拉取加速（阿里云个人容器镜像 ACR）
如果飞牛拉取 `ghcr.io` 较慢且没有配置代理，可以在阿里云免费开通「容器镜像服务个人版」，然后在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中添加 4 个 Secret：
- `ACR_REGISTRY`（如 `registry.cn-hangzhou.aliyuncs.com`）
- `ACR_NAMESPACE`（你的命名空间）
- `ACR_USERNAME`、`ACR_PASSWORD`

下次 `git push` 时 GitHub Actions 会自动同步推送一份到阿里云，把飞牛 Compose 里的 `image` 改成阿里云地址即可。

### 备选：不经过 GitHub，直接在 NAS 本地构建
把本项目文件夹（不含 `.venv`、`data`）拷贝到 NAS，修改 `docker-compose.build.yml` 中的密码和路径后执行：
```bash
docker compose -f docker-compose.build.yml up -d --build
```

### 安装为 PWA
- **iPhone/iPad**：Safari 打开 → 分享 → 「添加到主屏幕」
- **Android / 电脑 Chrome、Edge**：地址栏右侧「安装」图标
- 完整 PWA 能力（Service Worker 离线外壳、Chrome 安装按钮）需要 **HTTPS**。局域网 `http://IP:8080` 也能用、iOS 也能添加到主屏幕；如需 HTTPS，可用飞牛自带的反向代理/证书功能或 FN Connect 映射到 8080 端口。

## 本地开发（Mac）
```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
DATA_DIR=./data APP_PASSWORD=test123 .venv/bin/uvicorn app.main:app --reload --port 8080
```
需要本机安装 ffmpeg 才会生成视频缩略图与转码。

## 代码结构
- `app/main.py` — 后端（FastAPI + SQLite），API 与文件存储
- `app/static/` — 前端（原生 HTML/CSS/JS，无需构建）+ PWA manifest / service worker
- `.github/workflows/docker.yml` — GitHub Actions 自动构建并推送 Docker 镜像
- `tools/make_icons.py` — 生成应用图标
