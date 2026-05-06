import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.openai.com/v1';
const API_KEY = process.env.API_KEY;
const MODEL_NAME = process.env.MODEL_NAME || 'gpt-4o';

app.get('/', (req, res) => res.json({ status: 'ok' }));

app.post('/api/parse-file', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { originalname, mimetype, buffer } = req.file;
  const ext = originalname.split('.').pop().toLowerCase();

  try {
    let text = '';

    if (ext === 'pdf' || mimetype === 'application/pdf') {
      const data = new Uint8Array(buffer);
      const doc = await pdfjs.getDocument({ data }).promise;
      const numPages = doc.numPages;

      let allText = '';
      for (let i = 1; i <= numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        allText += pageText + '\n';
        page.cleanup();
      }

      const meaningfulText = allText.replace(/[\s\n\r\-—_=|.*#\d]/g, '').trim();
      const avgCharsPerPage = meaningfulText.length / numPages;
      console.log(`PDF: ${originalname}, pages: ${numPages}, avgChars: ${avgCharsPerPage}`);

      if (avgCharsPerPage < 20) {
        console.log('PDF detected as image-based, rendering pages...');
        const totalPages = Math.min(numPages, 20);
        const images = [];
        const scale = 1.5;
        for (let i = 1; i <= totalPages; i++) {
          console.log(`Rendering page ${i}/${totalPages}...`);
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = createCanvas(viewport.width, viewport.height);
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          const jpegBuffer = canvas.toBuffer('image/jpeg', 80);
          const dataUrl = 'data:image/jpeg;base64,' + jpegBuffer.toString('base64');
          images.push(dataUrl);
          page.cleanup();
        }
        doc.destroy();
        console.log(`PDF rendering done, ${images.length} images`);
        return res.json({ images, filename: originalname });
      }

      doc.destroy();
      text = allText;
    } else if (ext === 'docx' || mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (['xlsx', 'xls'].includes(ext) || mimetype.includes('spreadsheet')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheets = [];
      for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        sheets.push(`--- Sheet: ${name} ---\n${csv}`);
      }
      text = sheets.join('\n\n');
    } else if (ext === 'pptx' || mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(buffer);
      const slides = [];
      const slideFiles = Object.keys(zip.files).filter(f => f.match(/^ppt\/slides\/slide\d+\.xml$/)).sort();
      for (const slideFile of slideFiles) {
        const xml = await zip.files[slideFile].async('string');
        const texts = xml.match(/<a:t>([^<]*)<\/a:t>/g);
        if (texts) {
          slides.push(texts.map(t => t.replace(/<\/?a:t>/g, '')).join(' '));
        }
      }
      text = slides.map((s, i) => `--- Slide ${i + 1} ---\n${s}`).join('\n\n');
    } else {
      text = buffer.toString('utf-8');
    }

    const maxChars = 50000;
    if (text.length > maxChars) {
      text = text.slice(0, maxChars) + `\n\n[内容过长，已截取前 ${maxChars} 个字符]`;
    }

    res.json({ text, filename: originalname });
  } catch (err) {
    console.error('File parse error:', err);
    res.status(500).json({ error: `Failed to parse file: ${err.message}` });
  }
});

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    let response;
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      response = await fetch(`${API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages,
          stream: true,
        }),
      });

      if (response.ok || response.status < 500) break;
      console.error(`API error ${response.status} (attempt ${attempt}/${maxRetries})`);
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000 * attempt));
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error ${response.status}:`, errorText);
      res.write(`data: ${JSON.stringify({ error: `API error: ${response.status} - ${errorText}` })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);
    }

    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
