# 穗维卓生物静态网站

按 `resource/v02/` 的 8 份 PSD 实现：首页与 7 个内页。HTML、CSS、原生 ES Modules，无前端运行时依赖。

## 预览与检查

```sh
npm run dev
# http://localhost:5173/
npm run build
npm run check
npm test
```

通过 HTTP 预览，勿直接用 file:// 打开 ES Modules 页面。`build` 从模板和数据重新生成 8 个 HTML 文件，不需要安装构建依赖。

## 页面

| 文件 | 内容 |
| --- | --- |
| `index.html` | 首页、设备热点、首屏切换 |
| `about.html` | 公司简介、两地布局、优势、价值观 |
| `product.html` | 核心单元、产品优势、工作流程、技术参数 |
| `process.html` | 工艺体系、团队实力、证书占位 |
| `service.html` | 服务体系、项目时间线、FAQ及静态反馈、下载占位 |
| `news.html` | 分类、分页和新闻列表 |
| `news-detail.html?id=…` | 新闻详情、返回列表、下一篇 |
| `contact.html` | 联系信息及静态咨询表单 |

## 修改入口

- `templates/`：共用页头、页脚、快捷联系、首页内容。
- `scripts/build-pages.mjs`：7 个内页的静态结构及站点生成；生成后提交 HTML，即可用普通静态服务器托管。
- `site-data.js`：统一联系方式、产品参数、新闻、FAQ、服务与流程数据。
- `common.js`：共用导航、搜索、弹窗、入场与前后台动效处理。
- `home.js`：首页文字轮播、设备热点与连接线。
- `pages.js`：新闻路由与分类、FAQ手风琴与反馈、静态表单校验。
- `page-model.js`：新闻筛选分页和反馈记录逻辑；后续可替换为后端数据读取与提交。
- `motion-core.js`：可取消动画、状态收尾与连接线插值。
- `styles.css`、`motion.css`、`pages.css`：基础布局、动效、内页及响应式样式。
- `scripts/extract_assets.py`、`scripts/extract_inner_assets.py`：PSD 素材提取；需要本地 Python 的 psd-tools / Pillow，普通网页预览不需要。

修改模板或数据后运行 `npm run build`。不要仅修改生成的 HTML，否则下次生成会覆盖。

## 静态范围与后续接入

- 新闻数据仍为 4 篇独立文章。按用户确认的“以 PSD 为准”，列表恢复重复样例组成的六卡片和三页展示；重复卡片链接到原文章，不创建虚构文章 ID。
- 分类、分页、文章ID和返回列表参数已打通；新增数据会自动进入真实分页。后续可接后端文章列表/详情。
- FAQ 使用稳定ID和答案版本。反馈保存在当前页面内存中，切换问答保留，刷新即清除；未向服务器提交，未显示虚构票数。
- 联系表单只校验格式和演示校验码，填写内容不会发送或存储；演示校验码不能替代服务端验证码。
- 按用户确认恢复 PSD 联系页主体的电话、邮箱和地址；页脚保留该区域自己的原稿信息。
- 证书扫描图、4份下载PDF、二维码未提供，页面显示待补充，不提供假证书或假下载。
- 3条FAQ的正式答案待补充；不采用两份参考代码中相互不一致的技术承诺。
- 首屏视频、英文版和正式备案信息仍待补充。
- 根据“以 PSD 为准”的要求提取原稿背景和文字图层；素材的原始标注保留在提取脚本与设计源文件中。

## 验证

`npm test` 包含 18 项核心/数据/链接回归。`http://localhost:5173/tests/motion-browser.html` 可运行 7 项原生浏览器动效回归。首页两项百分比每次加载只计数一次，刷新时已可见也播放，滚走后再次进入不重播。

静态内页交付记录见 `docs/STATIC_PAGES_IMPLEMENTATION.md`；PSD 分析见 `docs/REMAINING_PSD_ANALYSIS.md`；首页动效规格和既有验证见 `docs/MOTION_REPAIR_PLAN.md` 与 `docs/MOTION_REPAIR_VERIFICATION.md`。

服务器发布使用 `npm run build:site` 生成 `dist/`，部署与回滚说明见 `docs/FORSIZE_DEPLOYMENT.md`。

桌面精度样式在 `precision.css`。`scripts/capture-pages.mjs` 可通过 Chrome CDP 对本地或线上八页截图，`scripts/compare-psd.py` 生成与 PSD 的逐页、逐区域差异图和 RGB 误差记录；误差值不作为还原度百分比。
