/**
 * Every piece of text the component shows. Override any of them with the `labels` option:
 *   labels: { dropTitle: 'Déposez vos fichiers', choose: 'Parcourir' }
 * `{name}`, `{n}`, `{size}`, `{max}` are filled in at runtime.
 */
export const DEFAULT_LABELS: Record<string, string> = {
  dropTitle: 'Drop files here',
  dropTitleTouch: 'Tap to choose files',
  browse: 'or click to browse',
  choose: 'Choose file',
  chooseFolder: 'Choose folder',
  skip: 'Upload it anyway',
  counter: 'Uploaded',
  zoneAria: 'Drop files here or click to choose',

  waiting: 'Waiting…',
  uploading: 'Uploading…',
  uploaded: 'Uploaded',
  ready: 'Ready',
  failed: 'Failed',
  cancelled: 'Cancelled',
  retry: 'Retry',
  cancel: 'Cancel',

  pasteTip: 'Tip: you can also paste a file or screenshot with Ctrl+V.',
  loadedOne: '1 file loaded.',
  loadedMany: '{n} files loaded.',
  miss: 'Missed! Try again.',
  tricky: 'Tricky one! You can upload it without the game.',
  easyAuto: 'Easy mode: that one is on the house!',
  statusUploading: 'Uploading {name}…',
  statusUploaded: '{name} uploaded.',
  statusFailed: '{name} failed to upload.',
  statusCancelled: '{name} cancelled.',
  statusBatch: '{done} of {total} done',
  readingFolder: 'Reading folder…',
  skippedMany: '{n} files skipped: {reason}',
  errFolderLimit: 'That folder has a lot of files. Only the first {max} were added.',
  soundOn: 'Sound on, click to mute',
  soundOff: 'Sound off, click to turn on',

  errType: 'file type not allowed',
  errSize: 'too large (max {max})',
  errCount: 'limit of {max} files reached',

  rulesSize: 'up to {size}',
  rulesFilesOne: 'max 1 file',
  rulesFiles: 'max {n} files',
  'type.image': 'Images',
  'type.video': 'Videos',
  'type.audio': 'Audio',
  'type.text': 'Text files',

  // themes
  'basketball.subtitle': 'or take the shot',
  'basketball.hint': 'Drop a file anywhere to load the ball, then drag it back and let go.',
  'basketball.hintTouch': 'Choose a file to load the ball, then drag it back and let go.',
  'claw.subtitle': 'or grab it with the claw',
  'claw.hint': 'Drop a file anywhere to put it in the machine, then drag to line up the claw and let go.',
  'claw.hintTouch': 'Choose a file to put it in the machine, then drag to line up the claw and let go.',
  'claw.slip': 'So close, it slipped! Line the claw up dead centre.',
  'claw.chute': 'UPLOAD',
  'rocket.subtitle': 'or hold the rocket to launch',
  'rocket.hint': 'Drop a file anywhere to build a rocket, then press and hold it to launch.',
  'rocket.hintTouch': 'Choose a file to build a rocket, then press and hold it to launch.',
  'rocket.prep': '🚀 Preparing launch… keep holding!',
  'rocket.ignite': '🔥 Engines started!',
  'rocket.fly': '🌌 Passing through the upload zone…',
  'rocket.near': '🛰️ Almost there…',
  'rocket.landed': '🪐 File successfully landed!',
  'rocket.crashed': '💥 Mission failed. Use Retry in the list below.',
  'rocket.aborted': 'Launch aborted.',
  'rocket.aborted.hold': 'Hold a little longer to launch.',
}

export function fill(template: string, vars?: Record<string, string | number>) {
  return vars ? template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : template
}
