# 🎲 随机数生成器 / Random Generator

一个功能丰富的 Chrome/Edge 浏览器扩展，提供多种随机数生成能力。
A feature-rich Chrome/Edge browser extension for generating random values.

## 功能 / Features

| 模式 Mode | 说明 Description |
|-----------|-----------------|
| **小数 Decimal** | 生成 0–1 之间指定小数位的随机小数（最高 32 位） / Random decimal with configurable precision (up to 32 places) |
| **整数 Integer** | 在自定义范围内生成随机整数 / Random integer within a custom range |
| **口令 Password** | 生成 CSPRNG 密码学安全随机口令 / Cryptographically secure random password (CSPRNG) |
| **颜色 Color** | 随机颜色：HEX / RGB / HSL / LAB / CMYK + 透明度 / Random color with multiple formats + opacity |
| **随机序列 Sequence** | 批量生成随机数数组（最多 1024 个） / Batch random number array (up to 1024 items) |

## 特性 / Highlights

- 🌐 **中英双语** / Chinese & English — follows browser locale
- 🔒 **4 级口令保密** / 4-tier password security (default / low / medium / high)
- 🎨 **8 种预设主题** + 自定义 HEX 颜色 / 8 preset themes + custom HEX
- 📜 **历史记录** / History (up to 1000 entries, exportable JSON)
- 🖱️ **选项卡排序** / Tab reorder with FLIP animation
- 💾 **偏好记忆** / Preferences persist across sessions
- ✅ **硬数据校验** / Strict input validation with red-box warnings

## 安装 / Install

1. 克隆或下载本仓库 / Clone or download this repo
2. 打开 Chrome/Edge，进入 `chrome://extensions` / Open `chrome://extensions`
3. 开启「开发者模式」 / Enable "Developer mode"
4. 点击「加载已解压的扩展程序」 / Click "Load unpacked"
5. 选择项目根目录 / Select the project root folder

## 项目结构 / Structure

```
├── manifest.json          # Chrome Extension Manifest V3
├── popup.html             # Popup UI
├── popup.css              # Stylesheet
├── popup.js               # Core logic
├── _locales/              # i18n (zh_CN + en)
├── icons/                 # Extension icons (16/48/128)
└── README.md
```

## 技术栈 / Tech Stack

- **Manifest V3**，纯前端，零外部依赖 / pure frontend, zero dependencies
- `crypto.getRandomValues()` — 密码学安全随机 / CSPRNG for passwords
- `chrome.storage.local` — 持久化 / persistence
- `chrome.i18n` — 国际化 / internationalization
- CIELAB D65 / CMYK 颜色空间转换 / color space conversion
- FLIP 动画 / animation

## License

MIT
