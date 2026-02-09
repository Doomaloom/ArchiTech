export const STARTER_HTML = `
  <header>
    <div class="header-links">
      <a href="#">Docs</a>
      <a href="#">Templates</a>
      <div class="icon-btn">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="#5f6368">
          <path d="M6 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM6 14c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM6 20c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"></path>
        </svg>
      </div>
      <div class="profile-pic">P</div>
    </div>
  </header>

  <main>
    <div class="logo">ProtoBop</div>

    <div class="search-wrapper">
      <div class="search-bar">
        <svg class="search-icon" viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
        </svg>
        <input type="text" class="search-input" autofocus>
        <div class="search-tools">
          <svg class="tool-icon" viewBox="0 0 24 24">
            <path fill="#4285f4" d="m12 15c1.66 0 3-1.31 3-2.97v-7.07c0-1.65-1.34-2.96-3-2.96s-3 1.31-3 2.96v7.07c0 1.66 1.34 2.97 3 2.97z"></path>
            <path fill="#34a853" d="m11 18.08h2v3.92h-2z"></path>
            <path fill="#fbbc05" d="m7.05 16.87c-1.27-1.33-2.05-3.12-2.05-5.09h2c0 1.39.56 2.65 1.47 3.56z"></path>
            <path fill="#ea4335" d="m12 18c-2.07 0-3.95-.84-5.32-2.19l-1.42 1.43c1.72 1.73 4.09 2.8 6.74 2.8 5.16 0 9.4-4.14 9.71-9.35l-2 .03c-.27 4.49-4 8.08-8.01 8.08z"></path>
          </svg>
          <svg class="tool-icon" viewBox="0 0 24 24">
            <path fill="#4285f4" d="m19.25 19h-14.5c-1.24 0-2.25-1.01-2.25-2.25v-9.5c0-1.24 1.01-2.25 2.25-2.25h14.5c1.24 0 2.25 1.01 2.25 2.25v9.5c0 1.24-1.01 2.25-2.25 2.25z"></path>
            <path fill="#fff" d="m12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"></path>
            <circle fill="#34a853" cx="16.5" cy="8.5" r="1.5"></circle>
          </svg>
        </div>
      </div>
    </div>

    <div class="button-group">
      <button class="btn">Start building</button>
      <button class="btn">Explore variants</button>
    </div>
  </main>

  <footer>
    <div class="footer-top">
      ProtoBop Workspace
    </div>
    <div class="footer-bottom">
      <div class="footer-links">
        <a href="#">About</a>
        <a href="#">Pricing</a>
        <a href="#">Enterprise</a>
        <a href="#">How it works</a>
      </div>
      <div class="footer-links">
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <a href="#">Contact</a>
      </div>
    </div>
  </footer>
`.trim();

export const STARTER_STYLES = `
  :root {
    --bg-color: #f8f9fa;
    --text-main: #202124;
    --text-secondary: #70757a;
    --border-color: #dfe1e5;
    --blue: #4285f4;
    --red: #ea4335;
    --yellow: #fbbc05;
    --green: #34a853;
    --button-bg: #f8f9fa;
    --shadow: 0 1px 6px rgba(32,33,36,0.28);
  }

  html, body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    font-family: arial, sans-serif;
    background-color: var(--bg-color);
    color: var(--text-main);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 6px 16px;
    height: 60px;
    box-sizing: border-box;
  }

  .header-links {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .header-links a {
    text-decoration: none;
    color: var(--text-main);
    font-size: 13px;
  }

  .header-links a:hover {
    text-decoration: underline;
  }

  .icon-btn {
    padding: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }

  .icon-btn:hover {
    background-color: rgba(60, 64, 67, 0.08);
  }

  .profile-pic {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #1a73e8, #8ab4f8);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 14px;
    margin-left: 8px;
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-top: 40px;
    padding-bottom: 120px;
  }

  .logo {
    display: inline-flex;
    font-size: 90px;
    font-weight: 700;
    letter-spacing: -2px;
    margin-bottom: 28px;
    user-select: none;
    animation: fadeIn 0.8s ease-out;
    background: linear-gradient(120deg, #2563eb, #f97316);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .search-wrapper {
    width: 100%;
    max-width: 584px;
    position: relative;
  }

  .search-bar {
    width: 100%;
    height: 44px;
    background: #fff;
    border: 1px solid var(--border-color);
    border-radius: 24px;
    display: flex;
    align-items: center;
    padding: 0 14px;
    box-sizing: border-box;
    transition: box-shadow 0.2s;
  }

  .search-bar:hover, .search-bar:focus-within {
    box-shadow: var(--shadow);
    border-color: rgba(223,225,229,0);
  }

  .search-icon {
    fill: #9aa0a6;
    width: 20px;
    height: 20px;
    margin-right: 12px;
  }

  .search-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 16px;
    color: var(--text-main);
    height: 34px;
  }

  .search-tools {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .tool-icon {
    width: 24px;
    height: 24px;
    cursor: pointer;
  }

  .button-group {
    margin-top: 28px;
    display: flex;
    gap: 12px;
  }

  .btn {
    background-color: #f8f9fa;
    border: 1px solid #f8f9fa;
    border-radius: 4px;
    color: #3c4043;
    font-family: arial, sans-serif;
    font-size: 14px;
    margin: 11px 4px;
    padding: 0 16px;
    line-height: 34px;
    height: 36px;
    min-width: 54px;
    text-align: center;
    cursor: pointer;
    user-select: none;
  }

  .btn:hover {
    box-shadow: 0 1px 1px rgba(0,0,0,0.1);
    background-color: #f8f9fa;
    border: 1px solid #dadce0;
    color: #202124;
  }

  footer {
    background-color: #f2f2f2;
    width: 100%;
    position: absolute;
    bottom: 0;
    font-size: 14px;
    color: var(--text-secondary);
  }

  .footer-top {
    padding: 15px 30px;
    border-bottom: 1px solid #dadce0;
  }

  .footer-bottom {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    padding: 0 20px;
  }

  .footer-links {
    display: flex;
    padding: 15px 10px;
  }

  .footer-links a {
    text-decoration: none;
    color: var(--text-secondary);
    margin: 0 15px;
  }

  .footer-links a:hover {
    text-decoration: underline;
  }
`.trim();
