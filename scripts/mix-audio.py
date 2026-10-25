"""Build the 60-second TRMS mix from generated assets; no network calls."""
from pathlib import Path
import json
import io
import re
import subprocess
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PLAN = json.loads((ROOT / 'voiceover/trms.json').read_text(encoding='utf-8'))
DIRECTORY = ROOT / 'public/audio/trms' / PLAN['productionId']
FFMPEG = ROOT / 'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'
RATE = 48000
SAMPLES = round(PLAN['durationSeconds'] * RATE)


def run(arguments, **kwargs):
    result = subprocess.run([str(FFMPEG), '-hide_banner', '-nostdin', *arguments], capture_output=True, **kwargs)
    if result.returncode:
        raise RuntimeError(result.stderr.decode('utf-8', errors='replace')[-2000:])
    return result


def decode(filename):
    raw = run(['-loglevel', 'error', '-i', str(filename), '-f', 'wav', '-acodec', 'pcm_s16le', '-ar', str(RATE), '-ac', '2', '-']).stdout
    with wave.open(io.BytesIO(raw), 'rb') as decoded:
        frames = decoded.readframes(decoded.getnframes())
    return np.frombuffer(frames, dtype='<i2').reshape(-1, 2).astype(np.float32) / 32768


def db_gain(db):
    return 10.0 ** (db / 20.0)


def cosine_ramp(length):
    return .5 - .5 * np.cos(np.linspace(0, np.pi, max(1, length)))


def save_wave(filename, samples):
    integers = np.rint(np.clip(samples, -.999999, .999999) * 8388607).astype('<i4').reshape(-1)
    packed = np.empty((len(integers), 3), dtype=np.uint8)
    for byte in range(3):
        packed[:, byte] = (integers >> (8 * byte)) & 255
    with wave.open(str(filename), 'wb') as output:
        output.setnchannels(2)
        output.setsampwidth(3)
        output.setframerate(RATE)
        output.writeframes(packed.tobytes())


def loudness(filename):
    result = run(['-loglevel', 'info', '-i', str(filename), '-af', 'loudnorm=I=-16:TP=-1.2:LRA=9:print_format=json',
                  '-ar', str(RATE), '-ac', '2', '-c:a', 'pcm_s16le', '-f', 'wav', '-'])
    matches = re.findall(r'\{[^{}]*"input_i"[^{}]*\}', result.stderr.decode('utf-8', errors='replace'), flags=re.S)
    if not matches:
        raise RuntimeError('Could not measure loudness of ' + str(filename))
    return json.loads(matches[-1])


narration = np.zeros((SAMPLES, 2), dtype=np.float32)
duck = np.zeros(SAMPLES, dtype=np.float32)
actual_cues = []

for cue in PLAN['scenes']:
    source = decode(DIRECTORY / (cue['id'] + '.mp3'))
    mono = np.mean(source, axis=1)
    chunk = 960  # 20 ms speech-activity windows.
    padded = np.pad(mono, (0, (-len(mono)) % chunk))
    levels = np.sqrt(np.mean(padded.reshape(-1, chunk) ** 2, axis=1))
    active = np.flatnonzero(levels > max(.003, float(np.max(levels)) * .045))
    if not len(active):
        raise RuntimeError('No audible voice in ' + cue['id'])
    trim_start = max(0, int(active[0]) * chunk - round(.06 * RATE))
    trim_end = min(len(mono), (int(active[-1]) + 1) * chunk + round(.14 * RATE))
    mono = mono[trim_start:trim_end].copy()
    duration = len(mono) / RATE
    if duration > cue['end'] - cue['start']:
        raise RuntimeError(f"{cue['id']} needs {duration:.2f}s, longer than its voice slot; speech was not cut or stretched.")
    active_samples = mono[np.abs(mono) > .008]
    rms = np.sqrt(np.mean(active_samples ** 2))
    gain = min(db_gain(-21) / max(float(rms), 1e-6), db_gain(-3) / max(float(np.max(np.abs(mono))), 1e-6))
    mono *= gain
    fade = min(round(.012 * RATE), len(mono) // 8)
    mono[:fade] *= cosine_ramp(fade)
    mono[-fade:] *= cosine_ramp(fade)[::-1]
    begin = round(cue['start'] * RATE)
    finish = begin + len(mono)
    narration[begin:finish] += mono[:, None]
    attack_start = max(0, begin - round(.22 * RATE))
    release_end = min(SAMPLES, finish + round(.65 * RATE))
    duck[attack_start:begin] = np.maximum(duck[attack_start:begin], cosine_ramp(begin - attack_start))
    duck[begin:finish] = 1
    duck[finish:release_end] = np.maximum(duck[finish:release_end], cosine_ramp(release_end - finish)[::-1])
    actual_cues.append({**cue, 'actualEnd': finish / RATE, 'actualDuration': duration, 'trimBefore': trim_start / RATE,
                        'trimAfter': (len(source) - trim_end) / RATE, 'gainDb': float(20 * np.log10(gain))})
    print(f"{cue['id']}: {cue['start']:.2f}-{finish / RATE:.2f}s", flush=True)

music = decode(DIRECTORY / 'music-original.mp3')
if len(music) < SAMPLES - RATE // 4:
    raise RuntimeError('Generated music is shorter than the film; no looping or abrupt padding was applied.')
music = music[:SAMPLES]
if len(music) < SAMPLES:
    music = np.pad(music, ((0, SAMPLES - len(music)), (0, 0)))
music *= db_gain(-23) / max(float(np.sqrt(np.mean(music ** 2))), 1e-6)
seconds = np.arange(SAMPLES, dtype=np.float64) / RATE
energy = np.interp(seconds, [0, 10, 12, 18, 29, 40, 43, 52, 57, 60], [.72, .76, .96, 1.0, 1.02, 1.06, .9, 1.0, 1.08, .85])
music_envelope = np.power(10, (-8 * duck) / 20) * energy
fade_in = round(1.2 * RATE)
fade_out = round(1.8 * RATE)
music_envelope[:fade_in] *= cosine_ramp(fade_in)
music_envelope[-fade_out:] *= cosine_ramp(fade_out)[::-1]
music *= music_envelope[:, None]

# Original quiet air movements, tied to the light swell and the camera passage.
# No melodic notes compete with the composed score.
effects = np.zeros_like(narration)
rng = np.random.default_rng(20261025)
for start, duration, rms_db in [(10.85, 1.65, -34), (40.5, 1.7, -36)]:
    length = round(duration * RATE)
    noise = rng.normal(0, 1, length)
    frequencies = np.fft.rfftfreq(length, 1 / RATE)
    band = np.exp(-.5 * ((frequencies - 1100) / 680) ** 2)
    air = np.fft.irfft(np.fft.rfft(noise) * band, n=length)
    air *= np.sin(np.linspace(0, np.pi, length)) ** 2
    air *= db_gain(rms_db) / max(float(np.sqrt(np.mean(air ** 2))), 1e-6)
    pan = np.linspace(-.3, .3, length)
    stereo = np.column_stack((air * np.sqrt((1 - pan) / 2), air * np.sqrt((1 + pan) / 2)))
    begin = round(start * RATE)
    effects[begin:begin + length] += stereo.astype(np.float32)

premaster = narration + music + effects
pre_path = DIRECTORY / 'premaster.wav'
save_wave(pre_path, premaster)
measurement = loudness(pre_path)
# One shared, linked lookahead limiter preserves the stereo image. Applying its
# gain to every stem keeps Studio's separate tracks equal to the exported mix.
gain_db = -16 - float(measurement['input_i'])
gain = db_gain(gain_db)
block = 96  # 2 ms control blocks, interpolated to sample resolution.
block_count = (SAMPLES + block - 1) // block
peaks = np.max(np.abs(np.pad(premaster, ((0, block_count * block - SAMPLES), (0, 0))).reshape(block_count, block, 2)), axis=(1, 2)) * gain
needed = np.minimum(1.0, db_gain(-1.5) / np.maximum(peaks, 1e-8))
lookahead = 5  # 10 ms, entirely within the baked soundtrack; no video shift.
extended = np.pad(needed, (0, lookahead), constant_values=1)
needed = np.minimum.reduce([extended[i:i + block_count] for i in range(lookahead + 1)])
control = np.ones(block_count, dtype=np.float32)
release = 1 - np.exp(-block / RATE / .12)
previous = 1.0
for i, ceiling in enumerate(needed):
    previous = min(float(ceiling), previous + (1 - previous) * release)
    control[i] = previous
gain_envelope = np.interp(np.arange(SAMPLES), np.arange(block_count) * block, control).astype(np.float32) * gain
stems = [('narration.wav', narration), ('music-ducked.wav', music), ('light-air.wav', effects)]
for filename, samples in stems:
    save_wave(DIRECTORY / filename, samples * gain_envelope[:, None])
save_wave(DIRECTORY / 'master.wav', premaster * gain_envelope[:, None])
final_measurement = loudness(DIRECTORY / 'master.wav')
manifest = {
    'productionId': PLAN['productionId'], 'durationSeconds': PLAN['durationSeconds'], 'sampleRate': RATE, 'channels': 2,
    'voiceName': PLAN['voiceName'], 'voiceId': PLAN['voiceId'], 'modelId': PLAN['modelId'],
    'musicModelId': PLAN['music']['modelId'], 'voiceCues': actual_cues,
    'musicDuckDb': -8, 'masterGainDb': gain_db,
    'limiterMaximumReductionDb': float(-20 * np.log10(np.min(control))),
    'integratedLufs': float(final_measurement['input_i']), 'truePeakDbtp': float(final_measurement['input_tp']),
    'loudnessRangeLu': float(final_measurement['input_lra']),
    'stems': [filename for filename, _ in stems], 'master': 'master.wav',
}
(DIRECTORY / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(json.dumps({key: manifest[key] for key in ['durationSeconds', 'integratedLufs', 'truePeakDbtp', 'masterGainDb']}), flush=True)
