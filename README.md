# XML Viewer

A browser-based XML viewer for previewing PDF to XML translations with embedded images.

## Features

- **ZIP File Support**: Upload a ZIP file containing XML and multimedia assets
- **Automatic Image Mapping**: Images from the multimedia folder are automatically linked to XML references
- **Rendered View**: Displays XML content as formatted HTML with proper styling
- **Raw XML View**: Toggle to see the original XML source code
- **Drag & Drop**: Easy file upload via drag and drop or click to browse
- **Responsive Design**: Works on desktop and mobile devices
- **Print Support**: Clean print output without UI elements

## ZIP File Structure

Your ZIP file should contain:

```
your-file.zip
├── document.xml          # Main XML file (any name with .xml extension)
└── multimedia/           # Folder containing images (any name)
    ├── image1.png
    ├── image2.jpg
    └── ...
```

## Supported XML Elements

The viewer recognizes and renders common XML elements:

| XML Element | Rendered As |
|-------------|-------------|
| `title`, `heading`, `h1` | Main heading |
| `h2`, `subtitle` | Secondary heading |
| `p`, `para`, `paragraph` | Paragraph |
| `img`, `image`, `figure`, `graphic` | Image |
| `table`, `tr`, `td`, `th` | Table |
| `ul`, `ol`, `list` | Lists |
| `b`, `bold`, `strong` | Bold text |
| `i`, `italic`, `em` | Italic text |
| `blockquote`, `quote` | Block quote |
| `section`, `chapter` | Section block |
| `pagebreak`, `page-break` | Page break indicator |

## Image Reference Formats

Images can be referenced in XML using various attribute names:

```xml
<image src="multimedia/image1.png"/>
<figure href="image1.png"/>
<graphic url="./multimedia/image1.png"/>
<img file="image1.png" alt="Description"/>
```

## Quick Start

### Option 1: Using Node.js Server

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open your browser to `http://localhost:3000`

### Option 2: Direct Browser (No Server)

Simply open `public/index.html` directly in a modern browser.

> Note: Some browsers may have restrictions with file:// protocol. Using a local server is recommended.

### Option 3: Using Python's HTTP Server

```bash
cd public
python -m http.server 8000
```

Then open `http://localhost:8000`

## Usage

1. Open the XML Viewer in your browser
2. Drag and drop a ZIP file onto the upload area, or click to browse
3. The XML content will be rendered with images displayed
4. Use the toggle buttons to switch between Rendered and Raw XML views
5. Click "Upload New File" to process another ZIP file

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Technology Stack

- Vanilla JavaScript (no frameworks)
- JSZip for ZIP file extraction
- Express.js for local development server

## License

MIT
