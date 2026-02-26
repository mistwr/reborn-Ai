export interface Theme {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  borderRadius: string
  fontFamily: string
  fontSize: string
}

export const DEFAULT_THEME: Theme = {
  primary: '#667eea',
  secondary: '#764ba2',
  accent: '#f093fb',
  background: '#ffffff',
  text: '#333333',
  borderRadius: '8px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: '16px',
}

export const PRESET_THEMES: Record<string, Theme> = {
  dark: {
    primary: '#1a1a1a',
    secondary: '#333333',
    accent: '#00d4ff',
    background: '#0a0a0a',
    text: '#ffffff',
    borderRadius: '12px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '16px',
  },
  minimal: {
    primary: '#000000',
    secondary: '#cccccc',
    accent: '#000000',
    background: '#ffffff',
    text: '#000000',
    borderRadius: '0px',
    fontFamily: 'Georgia, serif',
    fontSize: '16px',
  },
  vibrant: {
    primary: '#ff6b6b',
    secondary: '#4ecdc4',
    accent: '#ffe66d',
    background: '#f7f7f7',
    text: '#1a1a1a',
    borderRadius: '16px',
    fontFamily: 'Inter, sans-serif',
    fontSize: '16px',
  },
  professional: {
    primary: '#2c3e50',
    secondary: '#34495e',
    accent: '#3498db',
    background: '#ecf0f1',
    text: '#2c3e50',
    borderRadius: '4px',
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: '14px',
  },
}

export const applyTheme = (html: string, theme: Theme): string => {
  const style = `
    <style>
      :root {
        --primary: ${theme.primary};
        --secondary: ${theme.secondary};
        --accent: ${theme.accent};
        --bg: ${theme.background};
        --text: ${theme.text};
        --radius: ${theme.borderRadius};
      }
      * {
        --font-family: ${theme.fontFamily};
        --font-size: ${theme.fontSize};
      }
      body {
        background-color: var(--bg);
        color: var(--text);
        font-family: var(--font-family);
        font-size: var(--font-size);
      }
      a {
        color: var(--primary);
      }
      button, .btn, .cta-button {
        background-color: var(--primary);
        color: var(--bg);
        border-radius: var(--radius);
      }
    </style>
  `

  if (html.includes('</head>')) {
    return html.replace('</head>', `${style}</head>`)
  }
  return `${style}${html}`
}
