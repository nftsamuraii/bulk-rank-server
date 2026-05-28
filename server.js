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
app.use(express.static(path.join(__dirname, 'public')));

app.post('/convert', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const inputPath  = req.file.path;
  const outputPath = inputPath + '.mp4';

  // Check if input has audio
  let hasAudio = false;
  try {
    const probe = execSync(`ffprobe -v quiet -print_format json -show_streams "${inputPath}"`).toString();
    const streams = JSON.parse(probe).streams;
    hasAudio = streams.some(s => s.codec_type === 'audio');
  } catch(e) {}

  const cmd = ffmpeg(inputPath)
    .outputOptions([
      '-c:v libx264',
      '-preset fast',
      '-crf 16',
      '-b:v 14M',
      '-maxrate 18M',
      '-bufsize 36M',
      '-vf scale=760:824,format=yuv420p',
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
