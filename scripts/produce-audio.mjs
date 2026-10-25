import {ElevenLabsClient} from '@elevenlabs/elevenlabs-js';
import {readFile, writeFile, mkdir, stat} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const config = JSON.parse(await readFile(path.join(root, 'voiceover/trms.json'), 'utf8'));
const directory = path.join(root, 'public/audio/trms', config.productionId);
const target = args[0] ?? 'all';
const exists = async filename => {try {return (await stat(filename)).size > 1000;} catch {return false;}};

async function main() {
  if (!args.includes('--confirm')) throw new Error('Pass --confirm to generate the requested narration and music using ElevenLabs credits.');
  if (!['voice', 'music', 'all'].includes(target)) throw new Error('Choose voice, music or all.');
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY is missing.');
  const client = new ElevenLabsClient();
  const request = {timeoutInSeconds: 180, maxRetries: 0};
  const subscription = await client.user.subscription.get(request);
  const remaining = subscription.characterLimit - subscription.characterCount;
  const characters = config.scenes.reduce((sum, cue) => sum + cue.text.length, 0);
  if (remaining < characters + (target === 'voice' ? 0 : 12000)) throw new Error('Not enough included credits for this production reserve; no generation was started.');
  const models = await client.models.list(request);
  if (target !== 'music' && !models.some(m => m.modelId === config.modelId && m.canDoTextToSpeech)) throw new Error(`TTS model ${config.modelId} is unavailable.`);
  await mkdir(directory, {recursive: true});
  await writeFile(path.join(directory, 'plan.json'), JSON.stringify(config, null, 2));
  console.log(`Production: ${config.productionId}. Included credits available: ${remaining}.`);
  if (target !== 'music') {
    for (let i = 0; i < config.scenes.length; i++) {
      const cue = config.scenes[i];
      const destination = path.join(directory, `${cue.id}.mp3`);
      if (await exists(destination)) {console.log(`Reuse ${cue.id}.mp3`); continue;}
      console.log(`Generating ${cue.id}: ${cue.text}`);
      const audio = await client.textToSpeech.convert(config.voiceId, {
        text: cue.text, modelId: config.modelId, outputFormat: config.outputFormat,
        voiceSettings: config.voiceSettings,
        previousText: config.scenes.slice(0, i).map(x => x.text).join(' ') || undefined,
        nextText: config.scenes.slice(i + 1).map(x => x.text).join(' ') || undefined,
      }, request);
      await pipeline(Readable.fromWeb(audio), createWriteStream(destination, {flags: 'wx'}));
      console.log(`Saved ${cue.id}.mp3`);
    }
  }
  if (target !== 'voice') {
    const destination = path.join(directory, 'music-original.mp3');
    if (await exists(destination)) console.log('Reuse music-original.mp3');
    else {
      console.log('Generating one 60-second instrumental score.');
      const audio = await client.music.compose(config.music, {timeoutInSeconds: 300, maxRetries: 0});
      await pipeline(Readable.fromWeb(audio), createWriteStream(destination, {flags: 'wx'}));
      console.log('Saved music-original.mp3');
    }
  }
  const after = await client.user.subscription.get(request);
  await mkdir(path.join(root, 'output'), {recursive: true});
  await writeFile(path.join(root, 'output/audio-generation-metadata.json'), JSON.stringify({
    provider: 'ElevenLabs', voiceId: config.voiceId, voiceName: config.voiceName,
    ttsModel: config.modelId, musicModel: config.music.modelId,
    creditsBefore: subscription.characterCount, creditsAfter: after.characterCount,
    observedCreditCounterDelta: after.characterCount - subscription.characterCount,
    billingNote: 'Subscription counters can update asynchronously. This snapshot does not establish final charges.',
    generatedAt: new Date().toISOString(),
  }, null, 2));
  console.log('Saved production assets. The subscription counter snapshot is recorded; it may update asynchronously.');
}

main().catch(error => {
  // SDK request objects may include credentials. Print no request or headers.
  const status = error?.body?.detail?.status;
  console.error(error?.statusCode
    ? `ElevenLabs HTTP ${error.statusCode}${typeof status === 'string' ? ` (${status})` : ''}. No automatic retry.`
    : error.message);
  process.exitCode = 1;
});
