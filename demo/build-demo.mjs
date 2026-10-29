import { spawnSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const demoDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(demoDir, "..");
const tempDir = path.join("/private/tmp", "neural-labs-demo-build");
const voice = "Samantha";
const rate = "172";
const padSeconds = 0.25;

const segments = [
  "Welcome to Neural Labs: a hands-on research simulator for learning how machine-learning systems are built.",
  "Start with a simple question: can a model tell cats from dogs? The overview connects the research steps.",
  "Choose a starting architecture, inspect individual layers, and adjust the network as your experiment takes shape.",
  "Explanations surface model capacity and tradeoffs beside the controls, making every decision easier to understand.",
  "Explore six contracts, from image classifiers to language models. Results are simulated for learning, and progress stays in your browser.",
];

const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: projectDir, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} failed:\n${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
};

const timestamp = (seconds) => {
  const totalMs = Math.round(seconds * 1000);
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const secs = Math.floor((totalMs % 60_000) / 1000);
  const millis = totalMs % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
};

await rm(tempDir, { recursive: true, force: true });
await mkdir(tempDir, { recursive: true });
await mkdir(demoDir, { recursive: true });

run("swift", ["-module-cache-path", path.join(tempDir, "swift-module-cache"), path.join(demoDir, "generate-slides.swift"), projectDir, tempDir]);

const audioDurations = [];
const audioPaths = [];
const slidePaths = [];
for (let index = 0; index < segments.length; index += 1) {
  const n = String(index + 1).padStart(2, "0");
  const audioPath = path.join(tempDir, `${n}.aiff`);
  const slidePath = path.join(tempDir, `${n}.png`);
  run("say", ["-v", voice, "-r", rate, "-o", audioPath, segments[index]]);
  const duration = Number(run("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", audioPath,
  ]));
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Could not read narration duration for segment ${n}`);
  audioDurations.push(duration);
  audioPaths.push(audioPath);
  slidePaths.push(path.join(tempDir, ["01-welcome.png", "02-overview.png", "03-model-builder.png", "04-explanations.png", "05-six-contracts.png"][index]));
}

const srtCaptions = [
  "Welcome to Neural Labs: a hands-on research simulator\nfor learning how machine-learning systems are built.",
  "Start with a simple question: can a model tell cats from dogs?\nThe overview connects the research steps.",
  "Choose a starting architecture, inspect individual layers,\nand adjust the network as your experiment takes shape.",
  "Explanations surface model capacity and tradeoffs beside the controls,\nmaking every decision easier to understand.",
  "Explore six contracts, from image classifiers to language models.\nResults are simulated for learning, and progress stays in your browser.",
];

const filters = [];
const inputs = [];
let inputIndex = 0;
for (let index = 0; index < segments.length; index += 1) {
  const videoInput = inputIndex++;
  inputs.push("-loop", "1", "-framerate", "30", "-i", slidePaths[index]);
  const audioInput = inputIndex++;
  inputs.push("-i", audioPaths[index]);
  const clipDuration = audioDurations[index] + padSeconds;
  filters.push(
    `[${videoInput}:v]zoompan=z='min(1.04,1+0.00005*on)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1440x900:fps=30,trim=duration=${clipDuration.toFixed(3)},setpts=PTS-STARTPTS,format=yuv420p[v${index}]`,
  );
  filters.push(
    `[${audioInput}:a]aresample=48000,apad=pad_dur=${padSeconds},atrim=duration=${clipDuration.toFixed(3)},asetpts=PTS-STARTPTS[a${index}]`,
  );
}

const concatInputs = segments.map((_, index) => `[v${index}][a${index}]`).join("");
filters.push(`${concatInputs}concat=n=${segments.length}:v=1:a=1[outv][outa]`);
const mp4Path = path.join(demoDir, "neural-labs-demo.mp4");
run("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "error", ...inputs,
  "-filter_complex", filters.join(";"),
  "-map", "[outv]", "-map", "[outa]", "-r", "30",
  "-c:v", "libx264", "-crf", "19", "-preset", "medium", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", mp4Path,
]);

let start = 0;
const srt = [];
for (let index = 0; index < segments.length; index += 1) {
  const end = start + audioDurations[index] + 0.12;
  srt.push(`${index + 1}\n${timestamp(start + 0.08)} --> ${timestamp(end)}\n${srtCaptions[index]}\n`);
  start += audioDurations[index] + padSeconds;
}
await writeFile(path.join(demoDir, "neural-labs-demo.srt"), `${srt.join("\n")}\n`, "utf8");

const script = [
  "# Neural Labs demo voiceover",
  "",
  ...segments.map((line, index) => `${index + 1}. ${line}`),
  "",
  "The video uses existing project screenshots and illustrative cat/dog photos. The narration is generated locally with the macOS Samantha text-to-speech voice. Captions are burned into the video and included as an SRT sidecar.",
].join("\n");
await writeFile(path.join(demoDir, "voiceover-script.md"), `${script}\n`, "utf8");

const finalDuration = Number(run("ffprobe", [
  "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", mp4Path,
]));
await writeFile(path.join(demoDir, "build-info.txt"), `Duration: ${finalDuration.toFixed(2)} seconds\nResolution: 1440x900\nVoice: ${voice}\nCaptions: burned in + SRT sidecar\n`, "utf8");
console.log(`Created ${mp4Path} (${finalDuration.toFixed(2)} sec)`);
