# forsize 部署记录

- 地址：<https://plus.forsize.cn/nickidea/>
- SSH：本机现有 `forsize` 别名。
- 首次发布源提交：`6bb527cd1a00`；后续发布从已提交且已推送的源码构建。
- 动效版本验证记录：`/srv/nickidea/releases/20261114T034630Z-8c33f2d6c689`。
- 当前版本链接：`/srv/nickidea/current`。
- Web入口：`/home/plus.forsize.cn/nickidea` → `/srv/nickidea/current`。
- Nginx配置：`/etc/nginx/conf.d/plus.forsize.cn.conf`。
- 发布前配置及记录：`/srv/nickidea/backups/20261112T085456Z-6bb527cd1a00/`。

## 动效版本验证记录

- 发布包文件清单 SHA-256：`8c33f2d6c689a5370294df9493e4e641bc671d726f60150031c9940752da984f`。
- 包含七个内页的首屏和内容动效，以及首页两项百分比每次加载首次可见时的递增（刷新时已可见也播放，滚走后重新进入不重播）。
- 上传新目录并校验全部文件后，以原子 rename 切换 current；未修改 Nginx 配置。
- 最新发布记录与文件清单：`/srv/nickidea/backups/20261114T034630Z-8c33f2d6c689/`。
- 最初稳定版本仍保留于 `/srv/nickidea/releases/20261112T085456Z-6bb527cd1a00`，需要回滚时可将 current 原子切回该目录。
- 构建、语法检查、18 项自动化测试和 7 项首页浏览器回归通过；公网 HTTPS 读取的 47 个发布文件全部与本地包一致。
- Chrome 线上验证：首页数字首次滚入递增、离开后重入不重播，数字区可见时刷新会重新递增；七个内页加载、标题入场完成、图片与横向宽度正常；减少动态效果直接显示最终值。未捕获脚本异常。测试为模拟桌面视口，未进行真实手机或 Safari 验收。

## 发布范围

使用 `npm run build:site` 生成 `dist/`。其中仅包含8个HTML页面、8个运行脚本、3份样式及assets。测试、设计文件、文档、模板、构建脚本、Git目录和package.json不包含在发布目录中。

域名根目录及原有文件保持不变。仅新增 `/nickidea` 到 `/nickidea/` 的跳转与 `/nickidea/` 的静态文件location；不存在的站内地址返回404，不回退到首页。

```nginx
location = /nickidea {
    return 301 /nickidea/;
}
location ^~ /nickidea/ {
    root /home/plus.forsize.cn;
    index index.html;
    try_files $uri $uri/ =404;
    autoindex off;
    expires -1;
}
```

沿用该域名现有有效HTTPS证书及安全响应头。Nginx进程未由systemd托管，使用 `nginx -t` 检查、`nginx -s reload` 平滑重载。

## 验证

- 构建、18个JavaScript文件语法检查、18项测试通过；生产包内页面链接、模块导入、CSS图片引用均存在。
- 公网首页与JavaScript返回200，类型正确，HTTPS证书验证成功。
- 服务器通过HTTPS读取8页及关键脚本、图片，与发布文件逐一校验SHA-256一致。
- 不存在的页面、测试、文档和Git配置路径返回404；原有 `J.A.R.V.I.S.html` 仍返回200；根目录未新增或替换index.html。
- 真实浏览器验证首页、新闻分类→详情→返回列表、FAQ展开及表单就绪；URL始终保留 `/nickidea/` 前缀，未发现已加载图片失败。
- 本地截图：`.design/forsize-live-home.png`。

## 后续更新与回滚

当前可重复执行命令：`npm run build:site` → 提交并推送源码 → `python3 scripts/deploy-release.py` → `python3 scripts/verify-release.py`。部署脚本校验发布包全部文件的SHA-256和路径、记录源提交与上一版本，普通内容发布不修改Nginx。公开端校验脚本逐个读取 `dist/` 文件，并额外确认文档、Git配置与不存在路径返回404。

后续更新先运行 `npm run build:site`、语法和测试检查，把 `dist/` 内容上传到新的release目录；核对文件与权限后，通过临时链接加原子rename切换 `/srv/nickidea/current`。普通内容更新不需要修改Nginx配置或重载。

保留旧release目录即可将current原子切回上一版本。若需完整撤销首次发布，则先确认Web入口仍指向上述current链接，移除这个新增入口，恢复本次备份中的Nginx配置，再运行配置检查和平滑重载。原有根目录文件不需要恢复。

GitHub仓库继续保持私有；Git push不会自动触发此服务器发布。每次发布在 `/srv/nickidea/backups/<release>/source-commit.txt` 记录源提交，在 `files.sha256` 保存发布文件清单。实际线上版本以 `readlink -f /srv/nickidea/current` 为准。
