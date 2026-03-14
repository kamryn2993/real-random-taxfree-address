/**
 * 语言切换模块
 * 处理多语言切换和跳转
 */

// 支持的语言配置
const languages = {
  'zh': {
    code: 'zh',
    name: '简体中文',
    nativeName: '简体中文',
    flag: '🇨🇳',
    path: '' // 根目录
  },
  'en': {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    path: '/en'
  },
  'ru': {
    code: 'ru',
    name: 'Русский',
    nativeName: 'Русский',
    flag: '🇷🇺',
    path: '/ru'
  },
  'es': {
    code: 'es',
    name: 'Español',
    nativeName: 'Español',
    flag: '🇪🇸',
    path: '/es'
  },
  'pt': {
    code: 'pt',
    name: 'Português',
    nativeName: 'Português (BR)',
    flag: '🇧🇷',
    path: '/pt'
  }
};

/**
 * 获取当前语言代码
 */
function getCurrentLanguage() {
  const path = window.location.pathname;

  // 从 URL 路径判断
  if (path.startsWith('/en/') || path.startsWith('/en')) {
    return 'en';
  } else if (path.startsWith('/ru/') || path.startsWith('/ru')) {
    return 'ru';
  } else if (path.startsWith('/es/') || path.startsWith('/es')) {
    return 'es';
  } else if (path.startsWith('/pt/') || path.startsWith('/pt')) {
    return 'pt';
  }
  return 'zh'; // 默认中文
}

/**
 * 获取当前页面路径（去除语言前缀，SEO友好格式）
 * 将 /index.html 转换为 /，生成更友好的URL
 */
function getCurrentPagePath() {
  const path = window.location.pathname;
  const currentLang = getCurrentLanguage();
  
  let pagePath = path;
  
  // 移除语言前缀（如果存在）
  if (currentLang !== 'zh') {
    const langPrefix = `/${currentLang}`;
    if (path.startsWith(langPrefix)) {
      pagePath = path.substring(langPrefix.length) || '/';
    }
  }
  
  // 将 /index.html 转换为 / (SEO友好)
  // 将 /xxx/index.html 转换为 /xxx/
  if (pagePath.endsWith('/index.html')) {
    pagePath = pagePath.replace(/\/index\.html$/, '/');
  } else if (pagePath === '/index.html') {
    pagePath = '/';
  }
  
  // 确保路径以 / 开头
  if (!pagePath.startsWith('/')) {
    pagePath = '/' + pagePath;
  }
  
  // 目录页：如果不是根路径，确保以 / 结尾（SEO友好）
  // 但文章页/文件页（.html）不能追加 /，否则会变成 xxx.html/ 导致资源相对路径解析错误
  const isHtmlFile = /\.html$/i.test(pagePath);
  if (!isHtmlFile && pagePath !== '/' && !pagePath.endsWith('/')) {
    pagePath = pagePath + '/';
  }
  
  return pagePath;
}

/**
 * 切换到指定语言
 */
function switchLanguage(langCode) {
  try {
    const targetLang = languages[langCode];
    if (!targetLang) {
      console.error(`Unsupported language: ${langCode}`);
      return;
    }
    
    const currentPagePath = getCurrentPagePath();

    // 跳转到对应语言路径（包含博客 /post/ 在内）
    const targetPath = targetLang.path + currentPagePath;
    
    // 防止重复跳转
    if (window.location.href === window.location.origin + targetPath) {
      return;
    }
    
    window.location.href = targetPath;
  } catch (error) {
    console.error('Error switching language:', error);
    // 如果出错，至少尝试跳转到目标语言的首页
    const targetLang = languages[langCode];
    if (targetLang) {
      window.location.href = targetLang.path + '/';
    }
  }
}

/**
 * 将页面内的“站内绝对链接”修正为当前语言目录
 * 例如：在 /en/ 下，把 href="/post/" 自动改为 href="/en/post/"
 *
 * 注意：
 * - 只处理以 "/" 开头的链接（站内绝对路径）
 * - 不处理静态资源（.css/.js/.json/.png/...）
 * - 不重复添加语言前缀
 */
export function localizeInternalAbsoluteLinks() {
  const currentLang = getCurrentLanguage();
  if (currentLang === 'zh') return;

  const langPrefix = languages[currentLang]?.path || '';
  if (!langPrefix) return;

  const isStaticAsset = (href) =>
    /\.(css|js|json|png|jpg|jpeg|webp|gif|svg|ico|xml|txt|map)(\?|#|$)/i.test(href);

  document.querySelectorAll('a[href^="/"]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) return;

    // 跳过协议相对 URL（//example.com）
    if (href.startsWith('//')) return;

    // 跳过静态资源
    if (isStaticAsset(href)) return;

    // 已经包含语言前缀则跳过
    if (
      href === langPrefix ||
      href.startsWith(langPrefix + '/') ||
      href.startsWith('/en/') ||
      href.startsWith('/ru/') ||
      href.startsWith('/es/') ||
      href.startsWith('/pt/')
    ) {
      return;
    }

    // 处理 "/" 根路径
    const normalized = href === '/' ? '/' : href;
    a.setAttribute('href', `${langPrefix}${normalized}`);
  });
}

// 全局事件监听器标志，确保只添加一次
let globalClickHandlerAdded = false;

/**
 * 初始化语言切换器
 */
export function initLanguageSwitcher() {
  const switchers = document.querySelectorAll('.language-switcher');
  if (!switchers.length) return;

  // 将切换函数暴露到全局（向后兼容）
  window.switchLanguage = switchLanguage;

  // 获取当前语言
  const currentLang = getCurrentLanguage();
  const currentLangData = languages[currentLang];
  const isMobileViewport = () => window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
  const formatCurrentLangLabel = () => {
    // 模板工程：保持与正式站一致的移动端缩写策略
    if (currentLang === 'zh' && isMobileViewport()) return 'CN';
    if (currentLang === 'pt' && isMobileViewport()) return 'PT';
    return `${currentLangData.flag} ${currentLangData.nativeName}`;
  };

  // 添加全局点击事件监听器（只添加一次）
  if (!globalClickHandlerAdded) {
    globalClickHandlerAdded = true;
    document.addEventListener('click', (e) => {
      // 关闭所有语言下拉菜单（如果点击的不是语言切换器内部）
      const clickedSwitcher = e.target.closest('.language-switcher');
      if (!clickedSwitcher) {
        document.querySelectorAll('.language-dropdown.active').forEach((dropdown) => {
          dropdown.classList.remove('active');
        });
      } else {
        // 如果点击的是语言切换器内部，检查是否点击在下拉菜单外部
        const clickedDropdown = e.target.closest('.language-dropdown');
        const clickedButton = e.target.closest('.language-switcher-btn, #language-switcher-btn');
        if (!clickedDropdown && !clickedButton) {
          clickedSwitcher.querySelectorAll('.language-dropdown.active').forEach((dropdown) => {
            dropdown.classList.remove('active');
          });
        }
      }
    });
  }

  switchers.forEach((wrapper) => {
    if (wrapper.dataset.langInited === '1') return;
    wrapper.dataset.langInited = '1';

    const langButton =
      wrapper.querySelector('#language-switcher-btn') ||
      wrapper.querySelector('.language-switcher-btn');
    const langDropdown =
      wrapper.querySelector('#language-dropdown') ||
      wrapper.querySelector('.language-dropdown');
    const langButtonText =
      wrapper.querySelector('#language-switcher-text') ||
      wrapper.querySelector('.language-switcher-text');

    if (!langButton || !langDropdown) return;

    // 更新按钮显示
    if (langButtonText) {
      langButtonText.textContent = formatCurrentLangLabel();
    }

    // 生成语言选项（不使用 inline onclick，避免被其他脚本/策略影响）
    langDropdown.innerHTML = Object.values(languages)
      .map((lang) => {
        const isActive = lang.code === currentLang;
        return `
          <a href="#"
             class="language-option ${isActive ? 'active' : ''}"
             data-lang="${lang.code}">
            <span class="language-flag">${lang.flag}</span>
            <span class="language-name">${lang.nativeName}</span>
          </a>
        `;
      })
      .join('');

    // 切换下拉菜单显示
    langButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isOpen = langDropdown.classList.contains('active');

      // 关闭其他下拉菜单
      document
        .querySelectorAll('.dropdown-menu.active, .language-dropdown.active')
        .forEach((menu) => {
          if (menu !== langDropdown) menu.classList.remove('active');
        });

      langDropdown.classList.toggle('active', !isOpen);
    });

    // 点击语言选项
    langDropdown.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-lang]');
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      
      // 防止重复点击
      if (a.classList.contains('switching')) {
        return;
      }
      a.classList.add('switching');
      
      const langCode = a.getAttribute('data-lang');
      try {
        switchLanguage(langCode);
      } catch (error) {
        console.error('Error in language switch handler:', error);
        a.classList.remove('switching');
      }
    });
  });

  // 处理横竖屏/窗口尺寸变化：与正式站保持一致
  if (!window.__langBtnResizeBound) {
    window.__langBtnResizeBound = true;
    const onResize = () => {
      document.querySelectorAll('.language-switcher').forEach((wrapper) => {
        const langButtonText =
          wrapper.querySelector('#language-switcher-text') ||
          wrapper.querySelector('.language-switcher-text');
        if (langButtonText) {
          langButtonText.textContent = formatCurrentLangLabel();
        }
      });
    };
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
  }
}

// 自动初始化 - 只在 DOM 加载完成后执行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    localizeInternalAbsoluteLinks();
    initLanguageSwitcher();
  });
} else {
  // DOM 已经加载完成，立即执行
  localizeInternalAbsoluteLinks();
  initLanguageSwitcher();
}


// 自动初始化
// 注意：有些页面会在脚本里提前调用 initLanguageSwitcher()，但当时 DOM 可能还没完全准备好。
// 所以这里始终在 DOMContentLoaded 再跑一遍，确保绑定成功（内部有去重逻辑）。
initLanguageSwitcher();
document.addEventListener('DOMContentLoaded', initLanguageSwitcher);

