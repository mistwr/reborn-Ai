import { Template } from '../stores/webcraft-store'

export const TEMPLATES: Template[] = [
  {
    id: 'landing-1',
    name: 'Minimal Landing',
    category: 'landing',
    thumbnail: '/templates/landing-1.jpg',
    description: 'Clean and minimal landing page for startups',
    tags: ['minimal', 'startup', 'clean'],
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Minimal Landing</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        header { padding: 20px 0; border-bottom: 1px solid #eee; }
        nav { display: flex; justify-content: space-between; align-items: center; }
        hero { text-align: center; padding: 100px 0; }
        h1 { font-size: 3em; margin-bottom: 20px; }
        p { font-size: 1.2em; color: #666; margin-bottom: 30px; }
        .cta-button { display: inline-block; padding: 15px 40px; background: #000; color: #fff; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <nav>
                <div class="logo">Brand</div>
                <div class="nav-links"><a href="#" style="margin-right: 20px;">Features</a><a href="#">Pricing</a></div>
            </nav>
        </div>
    </header>
    <section class="hero">
        <div class="container">
            <h1>Welcome to Our Platform</h1>
            <p>Build something amazing today</p>
            <a href="#" class="cta-button">Get Started</a>
        </div>
    </section>
</body>
</html>`,
  },
  {
    id: 'landing-2',
    name: 'Modern SaaS',
    category: 'landing',
    thumbnail: '/templates/landing-2.jpg',
    description: 'Modern SaaS landing page with features section',
    tags: ['saas', 'modern', 'business'],
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Modern SaaS</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .hero { padding: 120px 0; text-align: center; }
        h1 { font-size: 2.5em; margin-bottom: 20px; }
        .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; padding: 80px 0; }
        .feature-card { background: #f5f5f5; padding: 30px; border-radius: 10px; text-align: center; }
        .feature-card h3 { margin-bottom: 10px; }
    </style>
</head>
<body>
    <section class="gradient-bg">
        <div class="container">
            <div class="hero">
                <h1>The Platform for Growth</h1>
                <p>Powerful tools for modern teams</p>
            </div>
        </div>
    </section>
    <section>
        <div class="container">
            <div class="features">
                <div class="feature-card"><h3>Fast</h3><p>Lightning quick performance</p></div>
                <div class="feature-card"><h3>Secure</h3><p>Enterprise-grade security</p></div>
                <div class="feature-card"><h3>Scalable</h3><p>Grows with your business</p></div>
            </div>
        </div>
    </section>
</body>
</html>`,
  },
  {
    id: 'portfolio-1',
    name: 'Creative Portfolio',
    category: 'portfolio',
    thumbnail: '/templates/portfolio-1.jpg',
    description: 'Showcase your creative work',
    tags: ['portfolio', 'creative', 'showcase'],
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Creative Portfolio</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Georgia, serif; background: #fafafa; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        header { padding: 40px 0; text-align: center; }
        h1 { font-size: 2.5em; margin-bottom: 10px; }
        .gallery { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; padding: 60px 0; }
        .project { background: white; padding: 20px; }
        .project img { width: 100%; height: auto; }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>My Work</h1>
            <p>Selected projects</p>
        </div>
    </header>
    <section>
        <div class="container">
            <div class="gallery">
                <div class="project"><div style="background: #ddd; height: 300px;"></div><h3>Project 1</h3></div>
                <div class="project"><div style="background: #ddd; height: 300px;"></div><h3>Project 2</h3></div>
            </div>
        </div>
    </section>
</body>
</html>`,
  },
  {
    id: 'blog-1',
    name: 'Blog Template',
    category: 'blog',
    thumbnail: '/templates/blog-1.jpg',
    description: 'Clean blog template with article layout',
    tags: ['blog', 'article', 'content'],
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Blog Template</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', serif; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        header { margin-bottom: 40px; text-align: center; }
        h1 { font-size: 2.5em; margin-bottom: 10px; }
        .meta { color: #999; margin-bottom: 40px; }
        article { line-height: 1.8; }
        article p { margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Article Title</h1>
            <div class="meta">Published on <time>March 15, 2024</time></div>
        </header>
        <article>
            <p>This is the beginning of your article. Write your content here with a clean, minimal design.</p>
            <p>Add multiple paragraphs to create engaging content.</p>
        </article>
    </div>
</body>
</html>`,
  },
]

export const getTemplatesByCategory = (category: string): Template[] => {
  return TEMPLATES.filter((t) => t.category === category)
}

export const searchTemplates = (query: string): Template[] => {
  const q = query.toLowerCase()
  return TEMPLATES.filter((t) => t.name.toLowerCase().includes(q) || t.tags.some((tag) => tag.includes(q)))
}
