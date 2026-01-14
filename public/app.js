// XML Viewer Application
class XMLViewer {
    constructor() {
        this.xmlFiles = []; // Array of {name, content, parsed}
        this.currentXmlIndex = 0;
        this.images = new Map(); // Map of image filename to blob URL
        this.currentView = 'rendered';

        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        this.uploadSection = document.getElementById('uploadSection');
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.controls = document.getElementById('controls');
        this.previewSection = document.getElementById('previewSection');
        this.renderedView = document.getElementById('renderedView');
        this.rawView = document.getElementById('rawView');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.errorMessage = document.getElementById('errorMessage');
        this.fileName = document.getElementById('fileName');
        this.backBtn = document.getElementById('backBtn');
        this.retryBtn = document.getElementById('retryBtn');
        this.viewRendered = document.getElementById('viewRendered');
        this.viewRaw = document.getElementById('viewRaw');
        this.xmlSelector = document.getElementById('xmlSelector');
        this.xmlSelectorContainer = document.getElementById('xmlSelectorContainer');
    }

    initEventListeners() {
        // File input change
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Click on upload area
        this.uploadArea.addEventListener('click', () => this.fileInput.click());

        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });

        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });

        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processFile(files[0]);
            }
        });

        // Back button
        this.backBtn.addEventListener('click', () => this.reset());
        this.retryBtn.addEventListener('click', () => this.reset());

        // View toggle
        this.viewRendered.addEventListener('click', () => this.switchView('rendered'));
        this.viewRaw.addEventListener('click', () => this.switchView('raw'));

        // XML file selector
        if (this.xmlSelector) {
            this.xmlSelector.addEventListener('change', (e) => {
                this.currentXmlIndex = parseInt(e.target.value);
                this.renderCurrentXML();
            });
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async processFile(file) {
        if (!file.name.endsWith('.zip')) {
            this.showError('Please upload a ZIP file');
            return;
        }

        this.showLoading();
        this.fileName.textContent = file.name;

        try {
            const zip = await JSZip.loadAsync(file);
            await this.extractContents(zip);
            this.showPreview();
        } catch (err) {
            console.error('Error processing ZIP:', err);
            this.showError('Failed to process ZIP file: ' + err.message);
        }
    }

    async extractContents(zip) {
        const xmlFiles = [];
        const imageFiles = [];

        // Iterate through all files in the ZIP
        for (const [path, zipEntry] of Object.entries(zip.files)) {
            if (zipEntry.dir) continue;

            const fileName = path.split('/').pop().toLowerCase();
            const extension = fileName.split('.').pop();

            // Find ALL XML files
            if (extension === 'xml') {
                xmlFiles.push({ path, entry: zipEntry, name: path.split('/').pop() });
            }

            // Find image files (in any folder, typically 'multimedia')
            if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff', 'tif'].includes(extension)) {
                imageFiles.push({ path, entry: zipEntry });
            }
        }

        if (xmlFiles.length === 0) {
            throw new Error('No XML file found in the ZIP');
        }

        // Sort XML files by name for consistent ordering
        xmlFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        // Extract and parse all XML files
        this.xmlFiles = [];
        for (const xmlFile of xmlFiles) {
            const content = await xmlFile.entry.async('text');
            const parser = new DOMParser();
            const parsed = parser.parseFromString(content, 'text/xml');

            // Check for parsing errors
            const parseError = parsed.querySelector('parsererror');
            if (parseError) {
                console.warn(`Warning: Invalid XML in ${xmlFile.name}: ${parseError.textContent}`);
            }

            this.xmlFiles.push({
                name: xmlFile.name,
                path: xmlFile.path,
                content: content,
                parsed: parsed,
                hasError: !!parseError
            });
        }

        // Extract images and create blob URLs
        for (const { path, entry } of imageFiles) {
            const blob = await entry.async('blob');
            const url = URL.createObjectURL(blob);

            // Store with multiple keys for flexible matching
            const fullName = path.split('/').pop();
            const baseName = fullName.toLowerCase();

            this.images.set(fullName, url);
            this.images.set(baseName, url);
            this.images.set(path, url);

            // Also store without extension for some XML formats
            const nameWithoutExt = fullName.replace(/\.[^.]+$/, '');
            this.images.set(nameWithoutExt, url);
            this.images.set(nameWithoutExt.toLowerCase(), url);
        }

        // Update the XML selector dropdown
        this.updateXmlSelector();

        // Render the first XML
        this.currentXmlIndex = 0;
        this.renderCurrentXML();
    }

    updateXmlSelector() {
        if (!this.xmlSelector || !this.xmlSelectorContainer) return;

        // Clear existing options
        this.xmlSelector.innerHTML = '';

        // Add options for each XML file
        this.xmlFiles.forEach((xmlFile, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = xmlFile.name + (xmlFile.hasError ? ' (parse error)' : '');
            this.xmlSelector.appendChild(option);
        });

        // Show/hide selector based on number of XML files
        if (this.xmlFiles.length > 1) {
            this.xmlSelectorContainer.style.display = 'flex';
        } else {
            this.xmlSelectorContainer.style.display = 'none';
        }
    }

    renderCurrentXML() {
        const xmlFile = this.xmlFiles[this.currentXmlIndex];
        if (!xmlFile) return;

        const root = xmlFile.parsed.documentElement;
        this.renderedView.innerHTML = `<div class="xml-document">${this.renderElement(root)}</div>`;
        this.rawView.textContent = this.formatXML(xmlFile.content);
    }

    renderElement(element) {
        const tagName = element.tagName.toLowerCase();
        let html = '';

        // Handle different element types
        switch (tagName) {
            case 'img':
            case 'image':
            case 'figure':
            case 'graphic':
            case 'picture':
                html = this.renderImage(element);
                break;

            case 'table':
                html = this.renderTable(element);
                break;

            case 'ul':
            case 'ol':
            case 'list':
                html = this.renderList(element, tagName === 'ol' ? 'ol' : 'ul');
                break;

            case 'li':
            case 'item':
            case 'listitem':
                html = `<li class="xml-list-item">${this.renderChildren(element)}</li>`;
                break;

            case 'title':
            case 'heading':
            case 'h1':
                html = `<h1 class="xml-title">${this.renderChildren(element)}</h1>`;
                break;

            case 'h2':
            case 'subtitle':
                html = `<h2 class="xml-h2">${this.renderChildren(element)}</h2>`;
                break;

            case 'h3':
                html = `<h3 class="xml-h3">${this.renderChildren(element)}</h3>`;
                break;

            case 'p':
            case 'para':
            case 'paragraph':
            case 'text':
                html = `<p class="xml-paragraph">${this.renderChildren(element)}</p>`;
                break;

            case 'b':
            case 'bold':
            case 'strong':
                html = `<strong class="xml-bold">${this.renderChildren(element)}</strong>`;
                break;

            case 'i':
            case 'italic':
            case 'em':
            case 'emphasis':
                html = `<em class="xml-italic">${this.renderChildren(element)}</em>`;
                break;

            case 'u':
            case 'underline':
                html = `<u class="xml-underline">${this.renderChildren(element)}</u>`;
                break;

            case 'code':
            case 'pre':
            case 'programlisting':
                html = `<code class="xml-code">${this.escapeHtml(element.textContent)}</code>`;
                break;

            case 'blockquote':
            case 'quote':
                html = `<blockquote class="xml-blockquote">${this.renderChildren(element)}</blockquote>`;
                break;

            case 'a':
            case 'link':
            case 'xref':
                const href = element.getAttribute('href') || element.getAttribute('url') || '#';
                html = `<a class="xml-link" href="${this.escapeHtml(href)}" target="_blank">${this.renderChildren(element)}</a>`;
                break;

            case 'br':
            case 'break':
            case 'linebreak':
                html = '<br>';
                break;

            case 'hr':
            case 'separator':
            case 'pagebreak':
            case 'page-break':
                html = '<div class="xml-page-break"></div>';
                break;

            case 'section':
            case 'div':
            case 'block':
            case 'chapter':
                html = `<div class="xml-section">${this.renderChildren(element)}</div>`;
                break;

            case 'header':
                html = `<div class="xml-header">${this.renderChildren(element)}</div>`;
                break;

            case 'footer':
                html = `<div class="xml-footer">${this.renderChildren(element)}</div>`;
                break;

            case 'caption':
            case 'figcaption':
                html = `<div class="xml-image-caption">${this.renderChildren(element)}</div>`;
                break;

            case 'span':
            case 'inline':
                html = `<span class="xml-element">${this.renderChildren(element)}</span>`;
                break;

            default:
                // For unknown elements, render as a block with children
                const hasBlockChildren = this.hasBlockElements(element);
                if (hasBlockChildren || element.children.length > 0) {
                    html = `<div class="xml-element-block" data-tag="${tagName}">${this.renderChildren(element)}</div>`;
                } else {
                    const content = this.renderChildren(element);
                    if (content.trim()) {
                        html = `<span class="xml-element" data-tag="${tagName}">${content}</span>`;
                    }
                }
        }

        return html;
    }

    renderImage(element) {
        // Try various attribute names for image source
        const srcAttrs = ['src', 'href', 'url', 'source', 'file', 'path', 'xlink:href'];
        let imageSrc = null;

        for (const attr of srcAttrs) {
            const value = element.getAttribute(attr);
            if (value) {
                imageSrc = value;
                break;
            }
        }

        // Also check for nested source elements
        if (!imageSrc) {
            const sourceEl = element.querySelector('source, src, file, path');
            if (sourceEl) {
                imageSrc = sourceEl.textContent.trim() || sourceEl.getAttribute('src');
            }
        }

        // Check element text content as fallback
        if (!imageSrc && element.childNodes.length === 1 && element.firstChild.nodeType === Node.TEXT_NODE) {
            imageSrc = element.textContent.trim();
        }

        if (!imageSrc) {
            return '<div class="image-error">Image source not found</div>';
        }

        // Find matching image from extracted files
        const imageUrl = this.findImageUrl(imageSrc);

        // Get caption if available
        const captionEl = element.querySelector('caption, figcaption, title, alt');
        const caption = captionEl ? captionEl.textContent : (element.getAttribute('alt') || element.getAttribute('title') || '');

        if (imageUrl) {
            return `
                <div class="xml-image-container">
                    <img class="xml-image" src="${imageUrl}" alt="${this.escapeHtml(caption)}" loading="lazy">
                    ${caption ? `<div class="xml-image-caption">${this.escapeHtml(caption)}</div>` : ''}
                </div>
            `;
        } else {
            return `<div class="image-error">Image not found: ${this.escapeHtml(imageSrc)}</div>`;
        }
    }

    findImageUrl(src) {
        // Clean up the source path
        const cleanSrc = src.replace(/^\.\//, '').replace(/^\//, '');
        const fileName = cleanSrc.split('/').pop();
        const baseName = fileName.toLowerCase();

        // Try different matching strategies
        const attempts = [
            src,
            cleanSrc,
            fileName,
            baseName,
            fileName.replace(/\.[^.]+$/, ''), // without extension
            baseName.replace(/\.[^.]+$/, ''),
        ];

        for (const attempt of attempts) {
            if (this.images.has(attempt)) {
                return this.images.get(attempt);
            }
        }

        // Try partial matching
        for (const [key, url] of this.images.entries()) {
            if (key.includes(fileName) || fileName.includes(key.split('/').pop())) {
                return url;
            }
        }

        return null;
    }

    renderTable(element) {
        let html = '<table class="xml-table">';

        // Find header row
        const thead = element.querySelector('thead, header, tgroup > thead');
        const tbody = element.querySelector('tbody, body, tgroup > tbody') || element;
        const rows = element.querySelectorAll('tr, row');

        if (rows.length === 0) {
            // Try alternative table structure
            const entries = element.querySelectorAll('entry, cell, td, th');
            if (entries.length > 0) {
                html += '<tbody><tr>';
                entries.forEach(entry => {
                    html += `<td>${this.renderChildren(entry)}</td>`;
                });
                html += '</tr></tbody>';
            }
        } else {
            rows.forEach((row, index) => {
                const cells = row.querySelectorAll('td, th, cell, entry');
                const isHeader = row.closest('thead') || row.closest('header') || index === 0 && row.querySelector('th');

                html += '<tr>';
                cells.forEach(cell => {
                    const tag = isHeader || cell.tagName.toLowerCase() === 'th' ? 'th' : 'td';
                    html += `<${tag}>${this.renderChildren(cell)}</${tag}>`;
                });
                html += '</tr>';
            });
        }

        html += '</table>';
        return html;
    }

    renderList(element, listType) {
        const items = element.querySelectorAll(':scope > li, :scope > item, :scope > listitem');
        let html = `<${listType} class="xml-list">`;

        if (items.length > 0) {
            items.forEach(item => {
                html += `<li class="xml-list-item">${this.renderChildren(item)}</li>`;
            });
        } else {
            html += this.renderChildren(element);
        }

        html += `</${listType}>`;
        return html;
    }

    renderChildren(element) {
        let html = '';

        for (const node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                if (text.trim()) {
                    html += this.escapeHtml(text);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                html += this.renderElement(node);
            }
        }

        return html;
    }

    hasBlockElements(element) {
        const blockTags = ['p', 'para', 'paragraph', 'div', 'section', 'table', 'ul', 'ol', 'list',
                          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'title', 'heading', 'blockquote',
                          'figure', 'image', 'img'];

        for (const child of element.children) {
            if (blockTags.includes(child.tagName.toLowerCase())) {
                return true;
            }
        }
        return false;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatXML(xml) {
        // Basic XML formatting for display
        let formatted = '';
        let indent = 0;
        const lines = xml.replace(/>\s*</g, '>\n<').split('\n');

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            // Decrease indent for closing tags
            if (line.startsWith('</')) {
                indent = Math.max(0, indent - 1);
            }

            formatted += '  '.repeat(indent) + line + '\n';

            // Increase indent for opening tags (not self-closing)
            if (line.startsWith('<') && !line.startsWith('</') &&
                !line.startsWith('<?') && !line.startsWith('<!') &&
                !line.endsWith('/>') && !line.includes('</')) {
                indent++;
            }
        }

        return formatted.trim();
    }

    switchView(view) {
        this.currentView = view;

        if (view === 'rendered') {
            this.renderedView.style.display = 'block';
            this.rawView.style.display = 'none';
            this.viewRendered.classList.add('active');
            this.viewRendered.classList.remove('btn-secondary');
            this.viewRendered.classList.add('btn-primary');
            this.viewRaw.classList.remove('active');
            this.viewRaw.classList.add('btn-secondary');
            this.viewRaw.classList.remove('btn-primary');
        } else {
            this.renderedView.style.display = 'none';
            this.rawView.style.display = 'block';
            this.viewRaw.classList.add('active');
            this.viewRaw.classList.remove('btn-secondary');
            this.viewRaw.classList.add('btn-primary');
            this.viewRendered.classList.remove('active');
            this.viewRendered.classList.add('btn-secondary');
            this.viewRendered.classList.remove('btn-primary');
        }
    }

    showLoading() {
        this.uploadSection.style.display = 'none';
        this.controls.style.display = 'none';
        this.previewSection.style.display = 'none';
        this.error.style.display = 'none';
        this.loading.style.display = 'block';
    }

    showPreview() {
        this.loading.style.display = 'none';
        this.uploadSection.style.display = 'none';
        this.error.style.display = 'none';
        this.controls.style.display = 'flex';
        this.previewSection.style.display = 'block';
    }

    showError(message) {
        this.loading.style.display = 'none';
        this.uploadSection.style.display = 'none';
        this.controls.style.display = 'none';
        this.previewSection.style.display = 'none';
        this.error.style.display = 'block';
        this.errorMessage.textContent = message;
    }

    reset() {
        // Clean up blob URLs
        for (const url of this.images.values()) {
            URL.revokeObjectURL(url);
        }
        this.images.clear();
        this.xmlFiles = [];
        this.currentXmlIndex = 0;
        this.fileInput.value = '';

        this.error.style.display = 'none';
        this.loading.style.display = 'none';
        this.controls.style.display = 'none';
        this.previewSection.style.display = 'none';
        this.uploadSection.style.display = 'flex';
        this.renderedView.innerHTML = '';
        this.rawView.textContent = '';

        if (this.xmlSelectorContainer) {
            this.xmlSelectorContainer.style.display = 'none';
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new XMLViewer();
});
