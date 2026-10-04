'use client';

import { useState, useEffect } from 'react';

const API_URL = 'http://127.0.0.1:8000';

const folderName = (p) => (p ? p.split('/').filter(Boolean).pop() : '');
const runUrl = (folder, file) => `${API_URL}/runs/${folder}/${file}`;

const screenshotUrl = (fullPath) => {
  if (!fullPath) return null;
  const idx = fullPath.indexOf('runs/');
  if (idx !== -1) return `${API_URL}/${fullPath.slice(idx)}`;
  return `${API_URL}/screenshots/${fullPath.split('/').pop()}`;
};

const ARTIFACTS = [
  ['instruction.txt', 'Original test instruction'],
  ['parsed_actions.json', 'Instruction parsing output'],
  ['screen_label.txt', 'Screen recognition label'],
  ['rag_match.json', 'Screen memory (RAG) match'],
  ['generated_code.py', 'Execution trace'],
  ['steps.json', 'Per-step results'],
  ['result.json', 'Complete run result'],
];

function Card({ title, subtitle, right, children }) {
  return (
    <section className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Badge({ tone = 'gray', children }) {
  const tones = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded border ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

function Stat({ label, value, sub, tone }) {
  const color = tone === 'green' ? 'text-green-700' : tone === 'red' ? 'text-red-700' : 'text-gray-900';
  return (
    <div className="border border-gray-200 rounded-lg px-4 py-3 bg-white">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1 break-words">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [apkPath, setApkPath] = useState('');
  const [apkName, setApkName] = useState('');
  const [uploadState, setUploadState] = useState('idle');
  const [instruction, setInstruction] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [steps, setSteps] = useState(null);
  const [elapsed, setElapsed] = useState(null);
  const [preview, setPreview] = useState(null);

  const folder = folderName(result?.run_folder);

  useEffect(() => {
    setSteps(null);
    if (!folder) return;
    fetch(runUrl(folder, 'steps.json'), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setSteps(Array.isArray(data) ? data : null))
      .catch(() => setSteps(null));
  }, [folder]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadState('uploading');
    setApkName(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/upload-apk`, { method: 'POST', body: formData });
      const data = await res.json();
      setApkPath(data.path);
      setUploadState('done');
    } catch (err) {
      setUploadState('error');
    }
  };

  const handleRunTest = async () => {
    if (!apkPath) {
      alert('Upload an APK first');
      return;
    }
    if (!instruction.trim()) {
      alert('Write a test instruction first');
      return;
    }

    setRunning(true);
    setResult(null);
    setElapsed(null);
    const started = Date.now();

    const formData = new FormData();
    formData.append('apk_path', apkPath);
    formData.append('instruction', instruction);

    try {
      const res = await fetch(`${API_URL}/run-test`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(900000),
      });

      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`HTTP ${res.status}: ${detail}`);
      }

      setResult(await res.json());
    } catch (err) {
      console.error('run-test failed:', err);
      setResult({ status: 'failed', error: `${err.name}: ${err.message}` });
    } finally {
      setElapsed((Date.now() - started) / 1000);
      setRunning(false);
    }
  };

  const parsed = Array.isArray(result?.parsed_actions) ? result.parsed_actions : [];
  const passedSteps = steps ? steps.filter((s) => s.status === 'passed').length : null;
  const totalSteps = parsed.length;
  const rate = passedSteps !== null && totalSteps > 0 ? Math.round((passedSteps / totalSteps) * 100) : null;
  const simMatch = result?.screen_source ? result.screen_source.match(/similarity:\s*([\d.]+)/) : null;
  const similarity = simMatch ? simMatch[1] : null;
  const reused = result?.screen_source ? result.screen_source.startsWith('Reused') : false;
  const isPassed = result?.status === 'passed';

  const stages = result
    ? [
        {
          name: 'Instruction parsing',
          detail: `${parsed.length} action${parsed.length === 1 ? '' : 's'} extracted`,
          ok: parsed.length > 0,
        },
        {
          name: 'Screen recognition',
          detail: result.screen_source || 'Not available',
          ok: !!result.screen_label,
        },
        {
          name: 'Test execution',
          detail: passedSteps !== null ? `${passedSteps} of ${totalSteps} steps passed` : 'Step data unavailable',
          ok: isPassed,
        },
        {
          name: 'Verdict',
          detail: (result.status || 'unknown').toUpperCase(),
          ok: isPassed,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">VeroFlow</h1>
            <p className="text-sm text-gray-500">Automated Android test execution and reporting</p>
          </div>
          <Badge tone="gray">Emulator-5554</Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <Card title="Test configuration" subtitle="Upload the application and describe the scenario to execute">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Application package (APK)</label>
              <input
                type="file"
                accept=".apk"
                onChange={handleUpload}
                className="block w-full text-sm text-gray-900 bg-white border border-gray-300 rounded-md p-2"
              />
              {uploadState === 'uploading' && <p className="text-sm text-gray-500 mt-2">Uploading {apkName}</p>}
              {uploadState === 'done' && <p className="text-sm text-green-700 mt-2">Uploaded: {apkName}</p>}
              {uploadState === 'error' && (
                <p className="text-sm text-red-700 mt-2">Upload failed. Confirm the backend is running.</p>
              )}
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Test instruction</label>
              <textarea
                rows={4}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Example: Tap Skip, tap Continue as Guest, tap Apartment Card, tap Book Now"
                className="block w-full border border-gray-300 rounded-md p-3 text-sm text-gray-900 bg-white placeholder-gray-400"
              />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleRunTest}
              disabled={running}
              className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-6 py-2.5 rounded-md hover:bg-gray-800 disabled:opacity-60"
            >
              {running && (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {running ? 'Executing on emulator' : 'Run test'}
            </button>
            {running && <p className="text-sm text-gray-500">Do not interact with the emulator while the test runs.</p>}
          </div>
        </Card>

        {result && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat label="Verdict" value={(result.status || 'unknown').toUpperCase()} tone={isPassed ? 'green' : 'red'} />
              <Stat
                label="Step success rate"
                value={rate !== null ? `${rate}%` : 'n/a'}
                sub={passedSteps !== null ? `${passedSteps} of ${totalSteps} steps passed` : 'No step data'}
              />
              <Stat
                label="Screen memory (RAG)"
                value={result.screen_source ? (reused ? 'Reused' : 'New') : 'n/a'}
                sub={similarity ? `Similarity ${similarity}` : result.screen_source || ''}
              />
              <Stat label="Duration" value={elapsed !== null ? `${elapsed.toFixed(1)} s` : 'n/a'} sub={folder} />
            </div>

            <Card title="Pipeline stages" subtitle="Output of each stage for this run">
              <ol className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {stages.map((s, i) => (
                  <li key={s.name} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold text-white ${
                          s.ok ? 'bg-green-600' : 'bg-red-600'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{s.name}</span>
                    </div>
                    <p className="text-xs text-gray-600 break-words">{s.detail}</p>
                  </li>
                ))}
              </ol>
            </Card>

            {result.error && (
              <Card title="Failure details">
                <pre className="bg-red-50 border border-red-200 text-red-800 text-xs p-4 rounded-md whitespace-pre-wrap break-words font-mono">
                  {result.error}
                </pre>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Parsed actions" subtitle="Structured actions extracted from the instruction">
                {parsed.length === 0 ? (
                  <p className="text-sm text-gray-500">No actions were extracted.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                          <th className="py-2 pr-3">#</th>
                          <th className="py-2 pr-3">Action</th>
                          <th className="py-2 pr-3">Target</th>
                          <th className="py-2">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.map((a, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="py-2 pr-3 text-gray-500">{i + 1}</td>
                            <td className="py-2 pr-3 font-medium text-gray-900">{a.action}</td>
                            <td className="py-2 pr-3 text-gray-700">{a.target}</td>
                            <td className="py-2 text-gray-700">{a.value || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <div className="space-y-6">
                <Card
                  title="Screen recognition"
                  subtitle="CLIP embedding, ChromaDB memory lookup, vision model label"
                  right={result.screen_source ? <Badge tone={reused ? 'blue' : 'gray'}>{reused ? 'Memory hit' : 'New screen'}</Badge> : null}
                >
                  {result.screen_label ? (
                    <>
                      <pre className="bg-gray-50 border border-gray-200 text-xs text-gray-800 p-4 rounded-md whitespace-pre-wrap break-words font-mono">
                        {result.screen_label}
                      </pre>
                      <p className="text-xs text-gray-500 mt-3">{result.screen_source}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">{result.screen_source || 'No screen label was produced.'}</p>
                  )}
                </Card>

                <Card title="Generated test case" subtitle="Executed steps with the element each action resolved to">
                  {result.generated_code ? (
                    <pre className="bg-gray-900 text-gray-100 text-xs p-4 rounded-md overflow-x-auto font-mono">
                      {result.generated_code}
                    </pre>
                  ) : (
                    <p className="text-sm text-gray-500">No execution trace was recorded.</p>
                  )}
                </Card>
              </div>
            </div>

            <Card title="Execution steps" subtitle="Result and screenshot captured after each step">
              {!steps ? (
                <p className="text-sm text-gray-500">Per-step data is not available for this run.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                        <th className="py-2 pr-3">#</th>
                        <th className="py-2 pr-3">Action</th>
                        <th className="py-2 pr-3">Target</th>
                        <th className="py-2 pr-3">Matched element</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2">Screenshot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {steps.map((s) => (
                        <tr key={s.n} className="border-b border-gray-100 align-middle">
                          <td className="py-3 pr-3 text-gray-500">{s.n}</td>
                          <td className="py-3 pr-3 font-medium text-gray-900">{s.action}</td>
                          <td className="py-3 pr-3 text-gray-700">{s.target}</td>
                          <td className="py-3 pr-3 text-gray-700">{s.matched || '-'}</td>
                          <td className="py-3 pr-3">
                            <Badge tone={s.status === 'passed' ? 'green' : 'red'}>{s.status.toUpperCase()}</Badge>
                          </td>
                          <td className="py-3">
                            <img
                              src={runUrl(folder, s.screenshot)}
                              alt={`step ${s.n}`}
                              onClick={() => setPreview(runUrl(folder, s.screenshot))}
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                              className="w-14 border border-gray-200 rounded cursor-pointer hover:opacity-80"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card title="Before and after" subtitle="Application state at session start and at the end of the run">
              <div className="flex flex-wrap gap-8">
                {result.before_screenshot && (
                  <figure>
                    <img
                      src={screenshotUrl(result.before_screenshot)}
                      alt="before"
                      onClick={() => setPreview(screenshotUrl(result.before_screenshot))}
                      className="w-44 border border-gray-200 rounded cursor-pointer"
                    />
                    <figcaption className="text-xs text-gray-500 mt-2">Before</figcaption>
                  </figure>
                )}
                {result.after_screenshot && (
                  <figure>
                    <img
                      src={screenshotUrl(result.after_screenshot)}
                      alt="after"
                      onClick={() => setPreview(screenshotUrl(result.after_screenshot))}
                      className="w-44 border border-gray-200 rounded cursor-pointer"
                    />
                    <figcaption className="text-xs text-gray-500 mt-2">After</figcaption>
                  </figure>
                )}
              </div>
            </Card>

            {folder && (
              <Card title="Run artifacts" subtitle={`Stored at backend/storage/runs/${folder}`}>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ARTIFACTS.map(([file, desc]) => (
                    <li key={file} className="flex items-center justify-between border border-gray-200 rounded-md px-4 py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                      <a
                        href={runUrl(folder, file)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-blue-700 hover:underline"
                      >
                        Open
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </main>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 cursor-pointer z-50"
        >
          <img src={preview} alt="preview" className="max-h-full rounded-lg shadow-xl" />
        </div>
      )}
    </div>
  );
}
