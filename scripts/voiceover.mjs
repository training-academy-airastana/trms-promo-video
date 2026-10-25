import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const command = args[0] ?? 'plan';
const option = (name) => {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing value for ${name}`);
  return args[index + 1];
};

async function main() {
  const config = JSON.parse(await readFile(path.join(root, 'voiceover/trms.json'), 'utf8'));
  const sceneId = option('--scene');
  const scenes = sceneId ? config.scenes.filter((scene) => scene.id === sceneId) : config.scenes;
  if (!scenes.length) throw new Error(`Unknown scene: ${sceneId}`);
  if (command === 'plan') {
    console.log(JSON.stringify({ ...config, scenes }, null, 2));
    return;
  }
  if (!['voices', 'generate'].includes(command)) throw new Error('Use plan, voices, or generate.');
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY is missing. Run ElevenLabs onboarding.');
  const client = new ElevenLabsClient();
  if (command === 'voices') {
    const result = await client.voices.getAll();
    console.log(JSON.stringify(result.voices.map(({ voiceId, name, labels, previewUrl }) => ({ voiceId, name, labels, previewUrl })), null, 2));
    return;
  }
  if (!args.includes('--confirm')) throw new Error('Generation uses ElevenLabs credits. Add --confirm after approving the voice and text.');
  const voiceId = option('--voice') ?? config.voiceId;
  const modelId = option('--model') ?? config.modelId;
  // Check capability before creating files or spending generation credits.
  const models = await client.models.list();
  if (!models.some((model) => model.modelId === modelId && model.canDoTextToSpeech)) {
    throw new Error(`TTS model ${modelId} is unavailable. Choose a supported model with --model.`);
  }
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(root, 'public/audio/trms', runId);
  await mkdir(outputDir, { recursive: true });
  const manifest = { voiceId, modelId, illustrativeData: config.illustrativeData, dataLabel: config.dataLabel, scenes: [] };
  for (const scene of scenes) {
    const index = config.scenes.findIndex((entry) => entry.id === scene.id);
    const audio = await client.textToSpeech.convert(voiceId, {
      text: scene.text,
      modelId,
      outputFormat: config.outputFormat,
      voiceSettings: config.voiceSettings,
      previousText: config.scenes.slice(0, index).map((entry) => entry.text).join(' ') || undefined,
      nextText: config.scenes.slice(index + 1).map((entry) => entry.text).join(' ') || undefined,
    });
    const filename = `${scene.id}.mp3`;
    await pipeline(Readable.fromWeb(audio), createWriteStream(path.join(outputDir, filename), { flags: 'wx' }));
    manifest.scenes.push({ ...scene, audio: filename, timingStatus: 'planned; measure audio duration before syncing video' });
    await writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`Saved ${filename}`);
  }
  console.log(`Output: ${outputDir}`);
  console.log('Scene times are targets. Measure actual speech durations before editing; audio is not padded or trimmed.');
}

main().catch((error) => {
  // Never dump SDK request objects: they can contain authentication headers.
  console.error(error?.statusCode ? `ElevenLabs request failed (HTTP ${error.statusCode}). Check permissions, model access, and credits.` : error.message);
  process.exitCode = 1;
});
