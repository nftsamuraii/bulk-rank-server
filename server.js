const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const ffmpeg  = require('fluent-ffmpeg');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const { execSync } = require('child_process');

const app    = express();
const upload = multer({ dest: os.tmpdir() });

app.use(cors());

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
    "media-src * blob: data:; " +
    "connect-src * blob: data:;"
  );
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.post('/convert', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const inputPath  = req.file.path;
  const outputPath = inputPath + '.mp4';

  let hasAudio = false;
  try {
    const probe = execSync(`ffprobe -v quiet -print_format json -show_streams "${inputPath}"`).toString();
    const streams = JSON.parse(probe).streams;
    hasAudio = streams.some(s => s.codec_type === 'audio');
    console.log('hasAudio:', hasAudio);
  } catch(e) {
    console.error('probe error:', e.message);
  }

  // Safe crop: scale to cover 760x824 then crop center, force even dimensions
  const vf = 'scale=760:824:force_original_aspect_ratio=increase,crop=760:824,format=yuv420p';

  const cmd = ffmpeg(inputPath)
    .outputOptions([
      '-c:v libx264',
      '-preset fast',
      '-crf 14',
      '-b:v 14M',
      '-maxrate 18M',
      '-bufsize 36M',
      `-vf ${vf}`,
      '-color_primaries bt709',
      '-color_trc bt709',
      '-colorspace bt709',
      '-movflags +faststart',
    ]);

  if (hasAudio) {
    cmd.outputOptions(['-c:a aac', '-b:a 192k']);
  } else {
    cmd.input('anullsrc=channel_layout=stereo:sample_rate=44100')
       .inputFormat('lavfi')
       .outputOptions(['-c:a aac', '-b:a 128k', '-shortest']);
  }

  cmd
    .output(outputPath)
    .on('start', cmd => console.log('ffmpeg started:', cmd))
    .on('end', () => {
      console.log('ffmpeg done');
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
      console.error('ffmpeg error:', err.message);
      fs.unlink(inputPath, () => {});
      res.status(500).json({ error: 'Conversion failed: ' + err.message });
    })
    .run();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
