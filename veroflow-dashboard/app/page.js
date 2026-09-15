// ============================================
// VeroFlow Next.js Dashboard
// ============================================


'use client';

import { useState } from 'react';

const API_URL = 'http://127.0.0.1:8000';

export default function Dashboard() {
  const [apkPath, setApkPath] = useState('');
  const [uploadMsg, setUploadMsg] = useState('');
  const [instruction, setInstruction] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadMsg('Uploading...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/upload-apk`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setApkPath(data.path);
      setUploadMsg(`✅ Uploaded: ${file.name}`);
    } catch (err) {
      setUploadMsg('❌ Upload failed — is the backend running?');
    }
  };

  const handleRunTest = async () => {
    if (!apkPath) {
      alert('Upload an APK first');
      return;
    }
    if (!instruction) {
      alert('Write a test instruction first');
      return;
    }

    setRunning(true);
    setResult(null);

    const formData = new FormData();
    formData.append('apk_path', apkPath);
    formData.append('instruction', instruction);

    try {
      const res = await fetch(`${API_URL}/run-test`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ status: 'failed', error: 'Could not reach backend' });
    } finally {
      setRunning(false);
    }
  };

  // Turns a full backend file path like "storage/screenshots/before_123.png"
  // into a URL the browser can actually load: http://127.0.0.1:8000/screenshots/before_123.png
  const screenshotUrl = (fullPath) => {
    if (!fullPath) return null;
    const filename = fullPath.split('/').pop();
    return `${API_URL}/screenshots/${filename}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-purple-700 mb-6">
          🚀 VeroFlow Dashboard
        </h1>

        {/* Step 1: Upload APK */}
        <div className="mb-6">
          <h2 className="font-semibold mb-2">1. Upload APK</h2>
          <input
            type="file"
            accept=".apk"
            onChange={handleUpload}
            className="block w-full text-sm text-gray-900 bg-white border border-gray-300 rounded p-2"
          />
          {uploadMsg && <p className="text-sm mt-2">{uploadMsg}</p>}
        </div>

        {/* Step 2: Write Instruction */}
        <div className="mb-6">
          <h2 className="font-semibold mb-2">2. Write Test Instruction</h2>
          <textarea
            rows={3}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Example: tap the login button"
            className="block w-full border border-gray-300 rounded p-2 text-sm text-gray-900 bg-white placeholder-gray-400"
          />
        </div>

        {/* Step 3: Run */}
        <button
          onClick={handleRunTest}
          disabled={running}
          className="w-full bg-purple-600 text-white font-semibold py-3 rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {running ? '⏳ Running on emulator...' : '▶ Run Test'}
        </button>

        {/* Result */}
        {result && (
          <div className="mt-8 border-t pt-6">
            <h2 className="font-semibold mb-3">Result</h2>

            <p className={`font-bold mb-3 ${
              result.status === 'passed' ? 'text-green-600' : 'text-red-600'
            }`}>
              Status: {result.status?.toUpperCase()}
            </p>

            {result.parsed_actions && (
              <div className="mb-3">
                <p className="text-sm font-semibold text-gray-600">Parsed Actions (Phase 1):</p>
                <pre className="bg-gray-100 text-xs p-3 rounded overflow-x-auto">
                  {JSON.stringify(result.parsed_actions, null, 2)}
                </pre>
              </div>
            )}

            {result.screen_label && (
              <div className="mb-3 bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm font-semibold text-blue-700">Screen Recognition (Phase 3/4/6):</p>
                <p className="text-sm">Label: {result.screen_label}</p>
                <p className="text-xs text-blue-600 mt-1">{result.screen_source}</p>
              </div>
            )}

            {result.generated_code && (
              <div className="mb-3">
                <p className="text-sm font-semibold text-gray-600">AI-Generated Code:</p>
                <pre className="bg-gray-100 text-xs p-3 rounded overflow-x-auto">
                  {result.generated_code}
                </pre>
              </div>
            )}

            {result.error && (
              <div className="mb-3">
                <p className="text-sm font-semibold text-red-600">Error:</p>
                <pre className="bg-red-50 text-xs p-3 rounded text-red-700">
                  {result.error}
                </pre>
              </div>
            )}

            <div className="flex gap-4 mt-4">
              {result.before_screenshot && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Before</p>
                  <img
                    src={screenshotUrl(result.before_screenshot)}
                    alt="before"
                    className="w-40 border rounded"
                  />
                </div>
              )}
              {result.after_screenshot && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">After</p>
                  <img
                    src={screenshotUrl(result.after_screenshot)}
                    alt="after"
                    className="w-40 border rounded"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}