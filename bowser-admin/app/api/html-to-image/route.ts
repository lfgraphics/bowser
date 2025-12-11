import { NextRequest, NextResponse } from 'next/server'

interface HtmlToImageRequest {
  html: string
  width?: number
  height?: number
  fullPage?: boolean
  quality?: number
  format?: 'png' | 'jpeg' | 'webp'
  filename?: string
  // New options for Tailwind support
  useTailwind?: boolean  // Auto-wrap with Tailwind CDN
  bodyContent?: string   // Just the body content (auto-wraps with HTML structure)
  customStyles?: string  // Additional custom CSS
  backgroundColor?: string // Background color for body
}

export async function POST(request: NextRequest) {
  try {
    const body: HtmlToImageRequest = await request.json()
    
    // Validate required fields
    if (!body.html && !body.bodyContent) {
      return NextResponse.json(
        { error: 'Either html or bodyContent is required' },
        { status: 400 }
      )
    }

    // Generate full HTML if bodyContent is provided
    let finalHtml = body.html
    
    if (body.bodyContent) {
      const useTailwind = body.useTailwind !== false // Default to true if bodyContent is used
      const bgColor = body.backgroundColor || 'bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600'
      
      finalHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Report</title>
  ${useTailwind ? '<script src="https://cdn.tailwindcss.com"></script>' : ''}
  ${body.customStyles ? `<style>${body.customStyles}</style>` : ''}
</head>
<body class="${bgColor} p-10 min-h-screen">
  ${body.bodyContent}
</body>
</html>
      `.trim()
    }

    // Set defaults
    const width = body.width || 1280
    const height = body.height || 720
    const fullPage = body.fullPage !== undefined ? body.fullPage : true
    const quality = 100
    const format = body.format || 'png'
    const filename = body.filename || `report-${Date.now()}.${format}`

    // Image generation with Puppeteer

    // Try @sparticuz/chromium-min for serverless environments
    try {
      // Dynamic import with error handling
      const puppeteer = await import('puppeteer').catch(() => null)
      
      if (!puppeteer) {
        throw new Error('Puppeteer not available')
      }

      // Detect environment: local dev vs serverless
      const isLocalDev = process.env.NODE_ENV === 'development' || !process.env.VERCEL
      let browser

      if (isLocalDev) {
        // Local development: Use system Chrome or Puppeteer's bundled Chromium
        browser = await puppeteer.default.launch({
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-extensions',
            '--disable-default-apps',
            '--disable-sync'
          ],
          defaultViewport: { width, height },
          headless: true,
        })
      } else {
        // Production/Vercel: Use @sparticuz/chromium-min
        try {
          const chromium = await import('@sparticuz/chromium-min')
          const chromiumPackUrl = 'https://github.com/Sparticuz/chromium/releases/download/v141.0.0/chromium-v141.0.0-pack.x64.tar'
          const executablePath = await chromium.default.executablePath(chromiumPackUrl)
          
          browser = await puppeteer.default.launch({
            args: [
              ...chromium.default.args,
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu',
              '--single-process',
              '--no-zygote',
              '--disable-web-security'
            ],
            defaultViewport: { width, height },
            executablePath,
            headless: true,
          })
        } catch (chromiumError) {
          // Fallback to bundled Puppeteer
          browser = await puppeteer.default.launch({
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu',
              '--single-process',
              '--no-zygote',
              '--disable-web-security'
            ],
            defaultViewport: { width, height },
            headless: true,
          })
        }
      }

      const page = await browser.newPage()
      
      try {
        await page.setViewport({ 
          width, 
          height, 
          deviceScaleFactor: 2 
        })
        
        await page.setContent(finalHtml, { 
          waitUntil: 'networkidle0',
          timeout: 15000
        })
        
        const screenshotOptions: any = {
          type: format,
          fullPage,
          omitBackground: false,
          encoding: 'binary'
        }
        
        // Add quality only for jpeg and webp
        if (format === 'jpeg' || format === 'webp') {
          screenshotOptions.quality = quality
        }
        
        const imageBuffer = await page.screenshot(screenshotOptions)
        await browser.close()

        // Ensure proper buffer handling and validate image
        const validImageBuffer = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer)
        
        if (validImageBuffer.length === 0) {
          throw new Error('Generated image buffer is empty')
        }

        // Determine content type
        const contentType = format === 'png' ? 'image/png' : 
                           format === 'jpeg' ? 'image/jpeg' : 
                           'image/webp'

        // Return the image with proper headers
        return new NextResponse(new Uint8Array(validImageBuffer), {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'public, max-age=3600',
            'Content-Length': validImageBuffer.length.toString()
          }
        })
      } catch (pageError) {
        await browser.close().catch(() => {})
        throw pageError
      }
      
    } catch (puppeteerError) {
      return NextResponse.json(
        { 
          error: 'Failed to generate image from HTML',
          details: puppeteerError instanceof Error ? puppeteerError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
