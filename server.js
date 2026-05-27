const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const ffmpeg  = require('fluent-ffmpeg');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');

const app    = express();
const upload = multer({ dest: os.tmpdir() });

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ── POST /convert  ────────────────────────────────────────
// Receives a webm file, returns mp4 with bt709 color space
app.post('/convert', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const inputPath  = req.file.path;
  const outputPath = inputPath + '.mp4';

  ffmpeg(inputPath)
    .outputOptions([
      '-c:v libx264',
      '-preset fast',
      '-crf 16',
      '-b:v 14M',
      '-maxrate 18M',
      '-bufsize 36M',
      '-vf scale=762:824,format=yuv420p',
      '-color_primaries bt709',
      '-color_trc bt709',
      '-colorspace bt709',
      '-movflags +faststart',
      '-an',           // no audio track needed
    ])
    .output(outputPath)
    .on('end', () => {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', 'attachment; filename="bulk-rank-video.mp4"');
      const stream = fs.createReadStream(outputPath);
      stream.pipe(res);
      stream.on('end', () => {
        fs.unlink(inputPath,  () => {});
        fs.unlink(outputPath, () => {});
      });
    })
    .on('error', err => {
      console.error('ffmpeg error:', err);
      fs.unlink(inputPath, () => {});
      res.status(500).json({ error: 'Conversion failed: ' + err.message });
    })
    .run();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
